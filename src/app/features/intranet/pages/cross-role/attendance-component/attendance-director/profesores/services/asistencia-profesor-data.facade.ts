import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ErrorHandlerService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { AsistenciaProfesorApiService } from '@shared/services/attendance/asistencia-profesor-api.service';

import { AsistenciaProfesorFilters, AsistenciaProfesorStore } from './asistencia-profesor.store';

/**
 * Facade de carga de datos para la vista admin de asistencia de profesores.
 * Read-only: solo orquesta llamadas HTTP al gateway + reconcilia en el store.
 *
 * La capa de cache vive en el SW (SWR) — por eso no se usa WAL (WAL es para
 * mutaciones con optimistic updates).
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaProfesorDataFacade {
	private readonly api = inject(AsistenciaProfesorApiService);
	private readonly store = inject(AsistenciaProfesorStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	// * Re-exponemos signals del store para que el componente no lo importe directo.
	readonly items = this.store.items;
	readonly pagination = this.store.pagination;
	readonly loading = this.store.loading;
	readonly loadingDetail = this.store.loadingDetail;
	readonly error = this.store.error;
	readonly filters = this.store.filters;
	readonly selectedProfesorDni = this.store.selectedProfesorDni;
	readonly selectedProfesorDetalle = this.store.selectedProfesorDetalle;

	// #region Listado paginado

	/**
	 * Carga el listado paginado de profesores aplicando los filtros actuales del store.
	 * Usa la paginación actual del store.
	 */
	loadList(): void {
		const { fechaInicio, fechaFin, estado } = this.store.filters();
		const { page, pageSize } = this.store.pagination();

		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.listarProfesores(fechaInicio, fechaFin, estado, page, pageSize)
			.pipe(
				withRetry({ tag: 'AsistenciaProfesorDataFacade:loadList' }),
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error cargando profesores:', err);
					this.errorHandler.showError(
						'Error',
						'No se pudo cargar la lista de profesores.',
					);
					return of(null);
				}),
				finalize(() => this.store.setLoading(false)),
			)
			.subscribe((response) => {
				if (!response) {
					this.store.setItems([]);
					return;
				}
				this.store.setItems(response.data);
				this.store.setPagination({
					page: response.page,
					pageSize: response.pageSize,
					total: response.total,
				});
			});
	}

	/**
	 * Refresca el listado actual sin resetear la página.
	 */
	refreshList(): void {
		this.loadList();
	}

	/**
	 * Actualiza los filtros y recarga el listado desde la primera página.
	 */
	applyFilters(filters: AsistenciaProfesorFilters): void {
		this.store.setFilters(filters);
		this.store.setPagination({ ...this.store.pagination(), page: 1 });
		this.loadList();
	}

	/**
	 * Cambia de página y recarga.
	 */
	changePage(page: number, pageSize: number): void {
		this.store.setPagination({ ...this.store.pagination(), page, pageSize });
		this.loadList();
	}

	// #endregion
	// #region Detalle profesor

	/**
	 * Carga el detalle de un profesor para modo día.
	 */
	loadProfesorDia(dni: string, fecha: Date): void {
		this.store.setLoadingDetail(true);
		this.store.setError(null);

		this.api
			.obtenerAsistenciaProfesorDia(dni, fecha)
			.pipe(
				withRetry({ tag: 'AsistenciaProfesorDataFacade:loadProfesorDia' }),
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error cargando día de profesor:', err);
					this.errorHandler.showError('Error', 'No se pudo cargar la asistencia del día.');
					return of(null);
				}),
				finalize(() => this.store.setLoadingDetail(false)),
			)
			.subscribe((detalle) => {
				this.store.setSelectedProfesorDetalle(detalle);
			});
	}

	/**
	 * Carga el detalle de un profesor para modo mes.
	 */
	loadProfesorMes(dni: string, mes: number, anio: number): void {
		this.store.setLoadingDetail(true);
		this.store.setError(null);

		this.api
			.obtenerAsistenciaProfesorMes(dni, mes, anio)
			.pipe(
				withRetry({ tag: 'AsistenciaProfesorDataFacade:loadProfesorMes' }),
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error cargando mes de profesor:', err);
					this.errorHandler.showError('Error', 'No se pudo cargar la asistencia mensual.');
					return of(null);
				}),
				finalize(() => this.store.setLoadingDetail(false)),
			)
			.subscribe((detalle) => {
				this.store.setSelectedProfesorDetalle(detalle);
			});
	}

	/**
	 * Refresca el detalle según el modo actual.
	 */
	refreshDetail(): void {
		const dni = this.store.selectedProfesorDni();
		if (!dni) return;

		if (this.store.viewMode() === 'dia') {
			this.loadProfesorDia(dni, this.store.selectedDate());
		} else {
			this.loadProfesorMes(dni, this.store.selectedMes(), this.store.selectedAnio());
		}
	}

	// #endregion
}
