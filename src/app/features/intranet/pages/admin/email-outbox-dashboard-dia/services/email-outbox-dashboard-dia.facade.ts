import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { logger } from '@core/helpers/logs/logger';

import { DashboardDiaErrorCode } from '../models/email-dashboard-dia.models';

import { EmailOutboxDashboardDiaService } from './email-outbox-dashboard-dia.service';
import { EmailOutboxDashboardDiaStore } from './email-outbox-dashboard-dia.store';

const LOG_TAG = 'DashboardDia:Facade';

@Injectable({ providedIn: 'root' })
export class EmailOutboxDashboardDiaFacade {
	// #region Dependencias
	private api = inject(EmailOutboxDashboardDiaService);
	private store = inject(EmailOutboxDashboardDiaStore);
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
		// Para el listado de fallos necesitamos la fecha concreta; si el caller no
		// seleccionó una, usamos "hoy Lima" calculada en el cliente (el BE hará lo
		// propio para el dashboard). Es consistente con el p-datepicker maxDate.
		const fechaParaFallos = fecha ?? this.hoyLimaIso();

		logger.tagged(LOG_TAG, 'info', 'load', { fecha: fechaParaFallos });

		forkJoin({
			dto: this.api.obtenerDashboardDia(fecha),
			fallosDia: this.api
				.listarFallosDia(fechaParaFallos)
				.pipe(catchError(() => of([]))),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ dto, fallosDia }) => {
					this.store.setDto(dto);
					this.store.setFallosDia(fallosDia);
					this.store.setLoading(false);
				},
				error: (err: unknown) => {
					this.handleError(err);
					this.store.setLoading(false);
				},
			});
	}

	private hoyLimaIso(): string {
		// Lima es UTC-5 constante (sin DST). Convertimos "ahora" a componentes Lima.
		const now = new Date();
		const limaMs = now.getTime() + (now.getTimezoneOffset() - 300) * 60_000;
		const lima = new Date(limaMs);
		const y = lima.getUTCFullYear();
		const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
		const d = String(lima.getUTCDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	refresh(): void {
		this.loadData();
	}

	setFecha(fecha: string | null): void {
		this.store.setFechaConsulta(fecha);
		this.loadData();
	}
	// #endregion

	// #region Error mapping
	private handleError(err: unknown): void {
		const errorCode = this.extractErrorCode(err);

		if (errorCode) {
			const message = this.getErrorMessage(errorCode);
			this.errorHandler.showError('Dashboard de correos', message);
			this.store.setError(errorCode);
			logger.tagged(LOG_TAG, 'warn', 'error_code', { errorCode });
			return;
		}

		this.errorHandler.showError(
			'Dashboard de correos',
			'No se pudo cargar el dashboard del día. Intenta refrescar.',
		);
		this.store.setError('UNKNOWN');
		logger.tagged(LOG_TAG, 'error', 'unknown_error', err);
	}

	private extractErrorCode(err: unknown): DashboardDiaErrorCode | null {
		if (!(err instanceof HttpErrorResponse)) return null;
		if (err.status !== 400) return null;
		const code = (err.error as { errorCode?: string } | null)?.errorCode;
		if (
			code === 'FECHA_FORMATO_INVALIDO' ||
			code === 'FECHA_FUTURA_INVALIDA' ||
			code === 'FECHA_DEMASIADO_ANTIGUA'
		) {
			return code;
		}
		return null;
	}

	private getErrorMessage(code: DashboardDiaErrorCode): string {
		switch (code) {
			case 'FECHA_FORMATO_INVALIDO':
				return 'Formato de fecha inválido. Usa yyyy-MM-dd.';
			case 'FECHA_FUTURA_INVALIDA':
				return 'La fecha no puede ser posterior a hoy.';
			case 'FECHA_DEMASIADO_ANTIGUA':
				return 'Solo se pueden consultar los últimos 90 días.';
		}
	}
	// #endregion
}
