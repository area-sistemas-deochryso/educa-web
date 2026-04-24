import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { logger } from '@core/helpers/logs/logger';

import { CorreosDiaErrorCode } from '../models/correos-dia.models';

import { CorreosDiaService } from './correos-dia.service';
import { CorreosDiaStore } from './correos-dia.store';

const LOG_TAG = 'DiagnosticoCorreosDia:Facade';

@Injectable({ providedIn: 'root' })
export class CorreosDiaFacade {
	// #region Dependencias
	private api = inject(CorreosDiaService);
	private store = inject(CorreosDiaStore);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		const fecha = this.store.fechaConsulta() ?? undefined;
		const sedeId = this.store.sedeId();

		logger.tagged(LOG_TAG, 'info', 'load', { fecha, sedeId });

		this.api
			.obtenerDiagnostico(fecha, sedeId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (dto) => {
					this.store.setDto(dto);
					this.store.setLoading(false);
				},
				error: (err: unknown) => {
					this.handleError(err);
					this.store.setLoading(false);
				},
			});
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
