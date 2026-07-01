import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';

import { facadeErrorHandler, type FacadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';

import { DashboardDiaErrorCode } from '../models/email-dashboard-dia.models';

import { EmailOutboxDashboardDiaService } from './email-outbox-dashboard-dia.service';
import { EmailOutboxDashboardDiaStore } from './email-outbox-dashboard-dia.store';

@Injectable({ providedIn: 'root' })
export class EmailOutboxDashboardDiaFacade {
	// #region Dependencias
	private api = inject(EmailOutboxDashboardDiaService);
	private store = inject(EmailOutboxDashboardDiaStore);
	private destroyRef = inject(DestroyRef);
	private errHandler: FacadeErrorHandler = facadeErrorHandler({
		tag: 'DashboardDiaFacade',
		errorHandler: inject(ErrorHandlerService),
	});
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

		forkJoin({
			dto: this.api.obtenerDashboardDia(fecha),
			fallosDia: this.api.listarFallosDia(fechaParaFallos).pipe(catchError(() => of([]))),
			fallosPorSender: this.api.obtenerFallosPorSender(fecha).pipe(catchError(() => of([]))),
			attendanceGaps: this.api.obtenerAsistenciasSinCorreo(fecha).pipe(catchError(() => of([]))),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ dto, fallosDia, fallosPorSender, attendanceGaps }) => {
					this.store.setDto(dto);
					this.store.setFallosDia(fallosDia);
					this.store.setFallosPorSender(fallosPorSender);
					this.store.setAttendanceGaps(attendanceGaps);
					this.store.setLoading(false);
				},
				error: (err: unknown) => {
					const errorCode = this.extractErrorCode(err);
					if (errorCode) {
						this.store.setError(errorCode);
					} else {
						this.store.setError('UNKNOWN');
					}
					this.errHandler.handle(err, 'cargar dashboard del día', () => {
						this.store.setLoading(false);
					});
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

	// #endregion
}
