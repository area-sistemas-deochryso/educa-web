import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ErrorHandlerService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { AsistenciaProfesorApiService } from '@shared/services/attendance';

import { AsistenciaPropiaStore } from './asistencia-propia.store';

/**
 * Facade de "Mi asistencia" para el profesor autenticado (Plan 21 Chat 4).
 * Consume los endpoints self-service `/profesor/me/mes` — el backend extrae
 * el DNI del claim, el frontend no lo maneja.
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
	readonly selectedMes = this.store.selectedMes;
	readonly selectedAnio = this.store.selectedAnio;
	readonly selectedLabel = this.store.selectedLabel;
	readonly conteo = this.store.conteo;
	readonly hasData = this.store.hasData;

	// #region Carga

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
					logger.error('Error cargando mi asistencia:', err);
					this.errorHandler.showError(
						'Error',
						'No se pudo cargar tu asistencia del mes.',
					);
					this.store.setError('No se pudo cargar la información');
					return of(null);
				}),
				finalize(() => this.store.setLoading(false)),
			)
			.subscribe((detalle) => {
				this.store.setDetalle(detalle);
			});
	}

	refresh(): void {
		this.loadMes();
	}

	// #endregion
	// #region Navegación de mes

	setMes(mes: number): void {
		if (mes < 1 || mes > 12) return;
		if (mes === this.store.selectedMes()) return;
		this.store.setMes(mes);
		this.loadMes();
	}

	setAnio(anio: number): void {
		if (anio === this.store.selectedAnio()) return;
		this.store.setAnio(anio);
		this.loadMes();
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
		this.loadMes();
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
		this.loadMes();
	}

	/**
	 * Vuelve al mes actual.
	 */
	goToCurrent(): void {
		const today = new Date();
		this.store.setMes(today.getMonth() + 1);
		this.store.setAnio(today.getFullYear());
		this.loadMes();
	}

	/**
	 * True si el mes seleccionado es el actual.
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
