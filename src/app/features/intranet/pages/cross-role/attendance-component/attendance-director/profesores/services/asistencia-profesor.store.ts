import { Injectable, computed, signal } from '@angular/core';

import { AsistenciaProfesorDto } from '@data/models/attendance.models';
import { AttendanceStatus } from '@data/models/attendance.models';

/**
 * Filtros de la vista de asistencia de profesores.
 */
export interface AsistenciaProfesorFilters {
	fechaInicio: Date;
	fechaFin: Date;
	estado: AttendanceStatus | null;
}

/**
 * Modo de visualización dentro del detalle del profesor.
 */
export type AsistenciaProfesorViewMode = 'dia' | 'mes';

/**
 * Paginación server-side (espejo de `PaginationState` pero local al feature).
 */
export interface AsistenciaProfesorPagination {
	page: number;
	pageSize: number;
	total: number;
}

/**
 * Store de lectura para la vista admin de asistencia de profesores
 * (Plan 21 Chat 3).
 *
 * Read-only desde la perspectiva del servidor — no hay mutaciones CRUD;
 * el único "write" operativo que ya existe es justificar (vive en el
 * service legacy y se reutiliza cuando se agregue el UI correspondiente).
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaProfesorStore {
	// #region Estado privado

	private readonly _items = signal<AsistenciaProfesorDto[]>([]);
	private readonly _pagination = signal<AsistenciaProfesorPagination>({
		page: 1,
		pageSize: 25,
		total: 0,
	});
	private readonly _loading = signal(false);
	private readonly _loadingDetail = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _selectedProfesorDni = signal<string | null>(null);
	private readonly _selectedProfesorDetalle = signal<AsistenciaProfesorDto | null>(null);
	private readonly _viewMode = signal<AsistenciaProfesorViewMode>('dia');
	private readonly _selectedDate = signal<Date>(new Date());
	private readonly _selectedMes = signal<number>(new Date().getMonth() + 1);
	private readonly _selectedAnio = signal<number>(new Date().getFullYear());
	private readonly _downloadingPdf = signal(false);

	private readonly _filters = signal<AsistenciaProfesorFilters>({
		fechaInicio: this.getDefaultStartDate(),
		fechaFin: new Date(),
		estado: null,
	});

	// #endregion
	// #region Lecturas públicas

	readonly items = this._items.asReadonly();
	readonly pagination = this._pagination.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loadingDetail = this._loadingDetail.asReadonly();
	readonly error = this._error.asReadonly();
	readonly selectedProfesorDni = this._selectedProfesorDni.asReadonly();
	readonly selectedProfesorDetalle = this._selectedProfesorDetalle.asReadonly();
	readonly viewMode = this._viewMode.asReadonly();
	readonly selectedDate = this._selectedDate.asReadonly();
	readonly selectedMes = this._selectedMes.asReadonly();
	readonly selectedAnio = this._selectedAnio.asReadonly();
	readonly downloadingPdf = this._downloadingPdf.asReadonly();
	readonly filters = this._filters.asReadonly();

	// #endregion
	// #region Computed

	readonly profesorOptions = computed(() =>
		this._items().map((p) => ({
			label: `${p.nombreCompleto} (${p.dni})`,
			value: p.dni,
		})),
	);

	readonly hasItems = computed(() => this._items().length > 0);
	readonly totalPages = computed(() => {
		const { pageSize, total } = this._pagination();
		if (pageSize <= 0) return 0;
		return Math.ceil(total / pageSize);
	});

	// #endregion
	// #region Mutaciones

	setItems(items: AsistenciaProfesorDto[]): void {
		this._items.set(items);
	}

	setPagination(pagination: AsistenciaProfesorPagination): void {
		this._pagination.set(pagination);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setLoadingDetail(loading: boolean): void {
		this._loadingDetail.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setSelectedProfesorDni(dni: string | null): void {
		this._selectedProfesorDni.set(dni);
	}

	setSelectedProfesorDetalle(detalle: AsistenciaProfesorDto | null): void {
		this._selectedProfesorDetalle.set(detalle);
	}

	setViewMode(mode: AsistenciaProfesorViewMode): void {
		this._viewMode.set(mode);
	}

	setSelectedDate(fecha: Date): void {
		this._selectedDate.set(fecha);
	}

	setSelectedMes(mes: number): void {
		this._selectedMes.set(mes);
	}

	setSelectedAnio(anio: number): void {
		this._selectedAnio.set(anio);
	}

	setDownloadingPdf(downloading: boolean): void {
		this._downloadingPdf.set(downloading);
	}

	setFilters(filters: AsistenciaProfesorFilters): void {
		this._filters.set(filters);
	}

	updateFilter<K extends keyof AsistenciaProfesorFilters>(
		key: K,
		value: AsistenciaProfesorFilters[K],
	): void {
		this._filters.update((current) => ({ ...current, [key]: value }));
	}

	clearSelection(): void {
		this._selectedProfesorDni.set(null);
		this._selectedProfesorDetalle.set(null);
	}

	// #endregion
	// #region Helpers privados

	private getDefaultStartDate(): Date {
		const today = new Date();
		const start = new Date(today);
		start.setDate(today.getDate() - 30);
		return start;
	}
	// #endregion
}
