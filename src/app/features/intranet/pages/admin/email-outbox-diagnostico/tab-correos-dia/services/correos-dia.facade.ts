import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, Subject, switchMap } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { logger } from '@core/helpers';

import { EmailOutboxDashboardDiaService } from '@features/intranet/pages/admin/email-outbox-shared';

import { CorreosDiaErrorCode } from '../models/correos-dia.models';

import { CorreosDiaService } from './correos-dia.service';
import { CorreosDiaStore } from './correos-dia.store';

const LOG_TAG = 'DiagnosticoCorreosDia:Facade';

@Injectable({ providedIn: 'root' })
export class CorreosDiaFacade {
	// #region Dependencias
	private api = inject(CorreosDiaService);
	private emailOutboxApi = inject(EmailOutboxDashboardDiaService);
	private store = inject(CorreosDiaStore);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	private readonly loadData$ = new Subject<void>();

	constructor() {
		this.loadData$
			.pipe(
				switchMap(() => {
					const fecha = this.store.fechaConsulta() ?? undefined;
					const sedeId = this.store.sedeId();

					logger.tagged(LOG_TAG, 'info', 'load', { fecha, sedeId });

					return forkJoin({
						dto: this.api.obtenerDiagnostico(fecha, sedeId),
						attendanceGaps: this.emailOutboxApi.obtenerAsistenciasSinCorreo(fecha).pipe(
							catchError((err) => {
								logger.tagged(LOG_TAG, 'warn', 'attendance_gaps_degraded', err?.status);
								return of([]);
							}),
						),
					}).pipe(
						catchError((err: unknown) => {
							this.handleError(err);
							this.store.setLoading(false);
							return of(null);
						}),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				if (!result) return;
				this.store.setDto(result.dto);
				this.store.setAttendanceGaps(result.attendanceGaps);
				this.store.setLoading(false);
			});
	}

	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);
		this.loadData$.next();
	}

	refresh(): void {
		this.loadData();
	}

	setFecha(fecha: string | null): void {
		this.store.setFechaConsulta(fecha);
		this.loadData();
	}

	setSedeId(sedeId: number | null): void {
		this.store.setSedeId(sedeId);
		this.loadData();
	}

	/**
	 * Reencolado manual de gaps SIN_RASTRO/FALLIDO. Refresca la data al terminar
	 * (exitoso o no) para que el panel refleje el estado real del outbox — el
	 * BE es la fuente de verdad, no el conteo optimista del toast.
	 */
	reencolar(asistenciaIds: number[]): void {
		if (asistenciaIds.length === 0) return;

		this.api.reencolar(asistenciaIds).subscribe({
			next: (resultado) => {
				logger.tagged(LOG_TAG, 'info', 'reencolar_result', resultado);

				if (resultado.encolados > 0) {
					const detalle =
						resultado.rechazados > 0
							? `${resultado.encolados} correo(s) encolado(s) — ${resultado.rechazados} no elegibles (ver detalle)`
							: `${resultado.encolados} correo(s) encolado(s) para reenvío`;
					this.errorHandler.showSuccess('Reencolado', detalle);
				} else {
					this.errorHandler.showWarning(
						'Reencolado',
						'Ningún caso se pudo reencolar — ya estaban enviados, sin correo de apoderado o blacklisteados.',
					);
				}

				this.refresh();
			},
			error: (err: unknown) => {
				logger.tagged(LOG_TAG, 'error', 'reencolar_error', err);
				this.errorHandler.showError('Reencolado', 'No se pudo reencolar. Intenta nuevamente.');
			},
		});
	}
	// #endregion

	// #region Error mapping
	private handleError(err: unknown): void {
		const errorCode = this.extractErrorCode(err);

		if (errorCode) {
			const message = this.getErrorMessage(errorCode);
			this.errorHandler.showError('Diagnóstico del día', message);
			this.store.setError(errorCode);
			logger.tagged(LOG_TAG, 'warn', 'error_code', { errorCode });
			return;
		}

		this.errorHandler.showError(
			'Diagnóstico del día',
			'No se pudo cargar el diagnóstico. Intenta refrescar.',
		);
		this.store.setError('UNKNOWN');
		logger.tagged(LOG_TAG, 'error', 'unknown_error', err);
	}

	private extractErrorCode(err: unknown): CorreosDiaErrorCode | null {
		if (!(err instanceof HttpErrorResponse)) return null;
		if (err.status !== 400) return null;
		const code = (err.error as { errorCode?: string } | null)?.errorCode;
		if (
			code === 'FECHA_FORMATO_INVALIDO' ||
			code === 'FECHA_FUTURA_INVALIDA' ||
			code === 'FECHA_DEMASIADO_ANTIGUA' ||
			code === 'SEDE_ID_INVALIDO'
		) {
			return code;
		}
		return null;
	}

	private getErrorMessage(code: CorreosDiaErrorCode): string {
		switch (code) {
			case 'FECHA_FORMATO_INVALIDO':
				return 'Formato de fecha inválido. Usa yyyy-MM-dd.';
			case 'FECHA_FUTURA_INVALIDA':
				return 'La fecha no puede ser posterior a hoy.';
			case 'FECHA_DEMASIADO_ANTIGUA':
				return 'Solo se pueden consultar los últimos 90 días.';
			case 'SEDE_ID_INVALIDO':
				return 'La sede seleccionada no es válida.';
		}
	}
	// #endregion
}
