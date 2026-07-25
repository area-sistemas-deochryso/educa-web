// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { environment } from '@env/environment';
import { logger } from '@core/helpers';
import { WalFacadeHelper } from '@core/services/wal';

import {
	CrearReporteSaludDto,
	EstadoSaludSedeDto,
	SaludSedeDimension,
	SaludSedeRating,
} from '@features/intranet/pages/cross-role/ayuda/sections/ayuda-salud-sede/models/salud-sede.models';
import { SaludSedeService } from '@features/intranet/pages/cross-role/ayuda/sections/ayuda-salud-sede/services/salud-sede.service';
// #endregion

/**
 * Estado + carga de la sección Salud de sede. Scoped al componente (no
 * `providedIn: 'root'`), mismo patrón que `AyudaQaFacade`.
 *
 * Sin historial: `estado` solo trae el estado vigente por dimensión
 * (`GET /api/salud-sede/estado`), nunca una lista de reportes pasados —
 * fuera de alcance de F6.
 */
@Injectable()
export class AyudaSaludSedeFacade {
	// #region Dependencies
	private readonly saludSedeService = inject(SaludSedeService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly reportesUrl = `${environment.apiUrl}/api/salud-sede/reportes`;
	// #endregion

	// #region State
	private readonly _estado = signal<EstadoSaludSedeDto[]>([]);
	private readonly _loadingEstado = signal(false);
	private readonly _errorEstado = signal(false);
	private readonly _submitting = signal(false);
	private readonly _submitError = signal(false);
	private readonly _submitSuccess = signal(false);

	readonly estado = this._estado.asReadonly();
	readonly loadingEstado = this._loadingEstado.asReadonly();
	readonly errorEstado = this._errorEstado.asReadonly();
	readonly submitting = this._submitting.asReadonly();
	readonly submitError = this._submitError.asReadonly();
	readonly submitSuccess = this._submitSuccess.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this.loadEstado();
	}

	/**
	 * Reporta la salud de una dimensión a nombre del usuario autenticado.
	 * `server-confirmed`: sin WAL/retries en background — el usuario ve el
	 * resultado (éxito o error) en el momento, mismo patrón que
	 * `FeedbackReportFacade.submit()`. No hay estado optimista que aplicar:
	 * el reporte no agrega un item a una lista local, solo recalcula el
	 * estado vigente en el servidor.
	 */
	reportar(dimension: SaludSedeDimension, rating: SaludSedeRating): void {
		this._submitting.set(true);
		this._submitError.set(false);
		this._submitSuccess.set(false);

		const dto: CrearReporteSaludDto = { dimension, rating };

		this.wal.execute({
			consistencyLevel: 'server-confirmed',
			operation: 'CREATE',
			resourceType: 'salud-sede-reportes',
			endpoint: this.reportesUrl,
			method: 'POST',
			payload: dto,
			http$: () => this.saludSedeService.crearReporte(dto),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: () => {
				this._submitting.set(false);
				this._submitSuccess.set(true);
				this.loadEstado();
			},
			onError: (err) => {
				logger.warn('[AyudaSaludSedeFacade] Error creando reporte', err);
				this._submitting.set(false);
				this._submitError.set(true);
			},
		});
	}

	/** Limpia los flags de resultado del último submit (para volver a intentar). */
	resetSubmitFeedback(): void {
		this._submitError.set(false);
		this._submitSuccess.set(false);
	}
	// #endregion

	// #region Private helpers
	private loadEstado(): void {
		this._loadingEstado.set(true);
		this._errorEstado.set(false);

		this.saludSedeService
			.getEstadoVigente()
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaSaludSedeFacade] Error cargando estado vigente', err?.status);
					this._errorEstado.set(true);
					return of([] as EstadoSaludSedeDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((estado) => {
				this._estado.set(estado);
				this._loadingEstado.set(false);
			});
	}
	// #endregion
}
