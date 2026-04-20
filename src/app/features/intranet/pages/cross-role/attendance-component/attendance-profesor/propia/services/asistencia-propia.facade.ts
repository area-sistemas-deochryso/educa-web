import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ErrorHandlerService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { AsistenciaProfesorApiService } from '@shared/services/attendance';
import {
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import { AsistenciaPropiaStore } from './asistencia-propia.store';

/**
 * Facade de "Mi asistencia" para el profesor autenticado
 * (Plan 21 Chat 4 + Chat 6 modo día/mes).
 *
 * Consume los endpoints self-service `/profesor/me/mes` y `/profesor/me/dia`
 * — el backend extrae el DNI del claim, el frontend no lo maneja.
 *
 * Read-only: solo orquesta llamadas HTTP + reconcilia en el store.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaPropiaFacade {
	private readonly api = inject(AsistenciaProfesorApiService);
	private readonly store = inject(AsistenciaPropiaStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	// * Re-exponemos signals del store para que el componente no lo importe directo.
	readonly detalle = this.store.detalle;
	readonly asistencias = this.store.asistencias;
	readonly loading = this.store.loading;
	readonly error = this.store.error;
	readonly viewMode = this.store.viewMode;
	readonly selectedMes = this.store.selectedMes;
	readonly selectedAnio = this.store.selectedAnio;
	readonly selectedDate = this.store.selectedDate;
	readonly selectedLabel = this.store.selectedLabel;
	readonly conteo = this.store.conteo;
	readonly hasData = this.store.hasData;

	// #region Carga (delegación por modo)

	/**
	 * Carga datos según el modo activo.
	 */
	load(): void {
		if (this.store.viewMode() === VIEW_MODE.Dia) {
			this.loadDia();
		} else {
			this.loadMes();
		}
	}

	refresh(): void {
		this.load();
	}

	/**
	 * Carga el mes actualmente seleccionado en el store.
	 */
	loadMes(): void {
		const mes = this.store.selectedMes();
		const anio = this.store.selectedAnio();

		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.obtenerMiAsistenciaMes(mes, anio)
			.pipe(
				withRetry({ tag: 'AsistenciaPropiaFacade:loadMes' }),
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error cargando mi asistencia del mes:', err);
					this.errorHandler.showError('Error', 'No se pudo cargar tu asistencia del mes.');
					this.store.setError('No se pudo cargar la información');
					return of(null);
				}),
				finalize(() => this.store.setLoading(false)),
			)
			.subscribe((detalle) => {
				this.store.setDetalle(detalle);
			});
	}

	/**
	 * Carga la fecha actualmente seleccionada en el store.
	 */
	loadDia(): void {
		const fecha = this.store.selectedDate();

		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.obtenerMiAsistenciaDia(fecha)
			.pipe(
				withRetry({ tag: 'AsistenciaPropiaFacade:loadDia' }),
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error cargando mi asistencia del día:', err);
					this.errorHandler.showError('Error', 'No se pudo cargar tu asistencia del día.');
					this.store.setError('No se pudo cargar la información');
					return of(null);
				}),
				finalize(() => this.store.setLoading(false)),
			)
			.subscribe((detalle) => {
				this.store.setDetalle(detalle);
			});
	}

	// #endregion
	// #region Navegación

	setViewMode(mode: ViewMode): void {
		if (mode === this.store.viewMode()) return;
		this.store.setViewMode(mode);
		// * Al entrar a modo día, sincroniza la fecha con el mes/año visible
		//   (primer día del mes) para que el usuario no salte de periodo.
		if (mode === VIEW_MODE.Dia) {
			const mes = this.store.selectedMes();
			const anio = this.store.selectedAnio();
			const today = new Date();
			const isCurrent = today.getMonth() + 1 === mes && today.getFullYear() === anio;
			this.store.setDate(isCurrent ? today : new Date(anio, mes - 1, 1));
		}
		this.load();
	}

	setMes(mes: number): void {
		if (mes < 1 || mes > 12) return;
		if (mes === this.store.selectedMes()) return;
		this.store.setMes(mes);
		this.load();
	}

	setAnio(anio: number): void {
		if (anio === this.store.selectedAnio()) return;
		this.store.setAnio(anio);
		this.load();
	}

	setDate(date: Date): void {
		if (!date) return;
		this.store.setDate(date);
		// * Mantener mes/año sincronizados con la fecha del modo día
		//   para que volver a modo mes muestre el periodo correcto.
		this.store.setMes(date.getMonth() + 1);
		this.store.setAnio(date.getFullYear());
		this.loadDia();
	}

	/**
	 * Avanza al mes siguiente (rollover de año en diciembre).
	 */
	nextMonth(): void {
		const mes = this.store.selectedMes();
		const anio = this.store.selectedAnio();
		if (mes === 12) {
			this.store.setMes(1);
			this.store.setAnio(anio + 1);
		} else {
			this.store.setMes(mes + 1);
		}
		this.load();
	}

	/**
	 * Retrocede al mes anterior (rollover de año en enero).
	 */
	prevMonth(): void {
		const mes = this.store.selectedMes();
		const anio = this.store.selectedAnio();
		if (mes === 1) {
			this.store.setMes(12);
			this.store.setAnio(anio - 1);
		} else {
			this.store.setMes(mes - 1);
		}
		this.load();
	}

	/**
	 * Vuelve al día/mes actual según el modo activo.
	 */
	goToCurrent(): void {
		const today = new Date();
		this.store.setMes(today.getMonth() + 1);
		this.store.setAnio(today.getFullYear());
		if (this.store.viewMode() === VIEW_MODE.Dia) {
			this.store.setDate(today);
		}
		this.load();
	}

	/**
	 * True si el periodo seleccionado es el actual.
	 */
	isCurrentMonth(): boolean {
		const today = new Date();
		return (
			this.store.selectedMes() === today.getMonth() + 1 &&
			this.store.selectedAnio() === today.getFullYear()
		);
	}

	// #endregion
}
