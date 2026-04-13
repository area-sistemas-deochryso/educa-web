// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { RequestTraceFacade } from '@core/services/trace';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';

import { CrearReporteRequest, ReporteFormData } from './feedback-report.models';
import { FeedbackReportService } from './feedback-report.service';
import { FeedbackReportStore } from './feedback-report.store';

// #endregion
// #region Implementation
/**
 * Facade del dialog de reporte de usuario. Orquesta validación + envío + ciclo UI.
 * Los componentes solo consumen este facade — nunca el service directo ni el store crudo.
 *
 * Idempotencia: delegada al WAL. Cada `wal.execute` crea una entry con UUID
 * propio que se envía como `X-Idempotency-Key`, garantizando dedup ante
 * retries y reloads. El doble-click rápido se bloquea con el guard
 * `store.submitting()`.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackReportFacade {
	private readonly service = inject(FeedbackReportService);
	private readonly store = inject(FeedbackReportStore);
	private readonly trace = inject(RequestTraceFacade);
	private readonly wal = inject(WalFacadeHelper);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/reportes-usuario`;

	/** Ventana para considerar un error visible como "el que el usuario está reportando". */
	private static readonly RECENT_ERROR_WINDOW_MS = 2 * 60_000;

	readonly vm = this.store.vm;

	// #region Comandos UI
	open(): void {
		this.store.resetForm();
		// Detectar si hay un error visible reciente ANTES de abrir — si existe,
		// el dialog mostrará el banner "enlazar con este error".
		const recentErrorId = this.trace.getRecentVisibleErrorId(
			FeedbackReportFacade.RECENT_ERROR_WINDOW_MS,
		);
		this.store.setRecentErrorId(recentErrorId);
		this.store.openDialog();
	}

	close(): void {
		this.store.closeDialog();
	}

	setLinkToRecentError(value: boolean): void {
		this.store.setLinkToRecentError(value);
	}

	toggle(): void {
		if (this.store.dialogVisible()) {
			this.close();
		} else {
			this.open();
		}
	}

	updateForm(patch: Partial<ReporteFormData>): void {
		this.store.updateForm(patch);
	}
	// #endregion

	// #region Envío
	submit(context: { url: string; userAgent: string }): void {
		const formData = this.store.formData();
		if (!this.store.isValid() || this.store.submitting()) return;

		this.store.setSubmitting(true);
		this.store.setError(null);

		// Prioridad:
		// 1. Si hay un error visible reciente y el usuario no desmarcó el banner,
		//    usamos ese ID → el reporte queda enlazado exactamente con el error que vio.
		// 2. Fallback: último request ID del trace interceptor.
		const correlationId = this.store.recentErrorId() && this.store.linkToRecentError()
			? this.store.recentErrorId()
			: this.trace.getLastRequestId();

		const request: CrearReporteRequest = {
			tipo: formData.tipo!,
			descripcion: formData.descripcion.trim(),
			propuesta: formData.propuesta?.trim() || null,
			url: context.url.slice(0, 500),
			userAgent: context.userAgent?.slice(0, 500) ?? null,
			correlationId,
			plataforma: 'WEB',
		};

		this.wal.execute({
			// server-confirmed: no WAL, no retries automáticos, error inmediato.
			// Los reportes manuales NO deben reintentarse en background: si el usuario
			// ve un 429 o un error, debe enterarse en el momento para decidir qué hacer.
			consistencyLevel: 'server-confirmed',
			operation: 'CREATE',
			resourceType: 'reporte-usuario',
			endpoint: this.apiUrl,
			method: 'POST',
			payload: request,
			http$: () => this.service.crear(request),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: () => {
				logger.log('[FeedbackReport] Reporte registrado correctamente');
				this.store.markSubmittedOk();
			},
			onError: (err) => {
				this.store.setSubmitting(false);

				// 429: mensaje específico con retry-after. No logueamos como error porque
				// es flujo esperado bajo spam accidental; el interceptor ya hizo exempt
				// del cooldown global, así que solo este dialog se entera.
				if (err instanceof HttpErrorResponse && err.status === 429) {
					const retryAfter = this.parseRetryAfterSeconds(err);
					this.store.setError(
						`Has enviado varios reportes seguidos. Espera ${retryAfter}s antes de enviar otro.`,
					);
					return;
				}

				logger.error('[FeedbackReport] Error al registrar reporte', err);
				this.store.setError(
					'No se pudo enviar el reporte. Intenta nuevamente en unos segundos.',
				);
			},
		});
	}
	// #endregion

	// #region Helpers
	/**
	 * Extrae el retry-after del header RFC 6585 o del body que el backend incluye
	 * en su OnRejected handler (`retryAfterSeconds`). Fallback a 60s.
	 */
	private parseRetryAfterSeconds(err: HttpErrorResponse): number {
		const header = err.headers?.get('Retry-After');
		if (header) {
			const parsed = parseInt(header, 10);
			if (!Number.isNaN(parsed) && parsed > 0) return parsed;
		}
		const body = err.error as Record<string, unknown> | null;
		const bodyValue = Number(body?.['retryAfterSeconds']);
		if (!Number.isNaN(bodyValue) && bodyValue > 0) return bodyValue;
		return 60;
	}
	// #endregion
}
// #endregion
