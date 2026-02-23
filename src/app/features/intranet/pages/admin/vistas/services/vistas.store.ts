import { Injectable, signal, computed } from '@angular/core';

import { Vista, VistasEstadisticas } from '@core/services';

// #region Interfaces
interface VistaForm {
	ruta: string;
	nombre: string;
	estado: number;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class VistasStore {
	// #region Estado privado
	private readonly _vistas = signal<Vista[]>([]);
	private readonly _loading = signal(false);

	private readonly _dialogVisible = signal(false);
	private readonly _isEditing = signal(false);

	private readonly _selectedVista = signal<Vista | null>(null);
	private readonly _formData = signal<VistaForm>({ ruta: '', nombre: '', estado: 1 });

	private readonly _searchTerm = signal('');
	private readonly _filterModulo = signal<string | null>(null);
	private readonly _filterEstado = signal<number | null>(null);
	private readonly _confirmDialogVisible = signal(false);

	// Pagination
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);

	// Estadísticas (loaded from API, not computed from paginated array)
	private readonly _estadisticas = signal<VistasEstadisticas>({
		totalVistas: 0,
		vistasActivas: 0,
		vistasInactivas: 0,
		totalModulos: 0,
		modulos: [],
	});
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly vistas = this._vistas.asReadonly();
	readonly loading = this._loading.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	readonly selectedVista = this._selectedVista.asReadonly();
	readonly formData = this._formData.asReadonly();

	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterModulo = this._filterModulo.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();

	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();

	readonly estadisticas = this._estadisticas.asReadonly();
	// #endregion

	// #region Computed — módulos (derived from API stats)
	readonly modulosOptions = computed(() => {
		const modulos = this._estadisticas().modulos;
		return [{ label: 'Todos los modulos', value: null as string | null }].concat(
			modulos.map((m) => ({
				label: m.charAt(0).toUpperCase() + m.slice(1),
				value: m as string | null,
			})),
		);
	});
	// #endregion

	// #region Computed — validación de formulario
	readonly isFormValid = computed(() => {
		const data = this._formData();
		return !!(data.ruta?.trim() && data.nombre?.trim());
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		vistas: this._vistas(),
		loading: this.loading(),
		estadisticas: this._estadisticas(),

		// Pagination
		page: this._page(),
		pageSize: this._pageSize(),
		totalRecords: this._totalRecords(),

		dialogVisible: this.dialogVisible(),
		isEditing: this.isEditing(),

		formData: this.formData(),
		isFormValid: this.isFormValid(),

		modulosOptions: this.modulosOptions(),
		searchTerm: this.searchTerm(),
		filterModulo: this.filterModulo(),
		filterEstado: this.filterEstado(),
		confirmDialogVisible: this.confirmDialogVisible(),
	}));
	// #endregion

	// #region Comandos de datos
	setVistas(vistas: Vista[]): void {
		this._vistas.set(vistas);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	/** Mutación quirúrgica: actualizar 1 vista */
	updateVista(id: number, updates: Partial<Vista>): void {
		this._vistas.update((list) =>
			list.map((v) => (v.id === id ? { ...v, ...updates } : v)),
		);
	}

	/** Mutación quirúrgica: toggle estado de 1 vista */
	toggleVistaEstado(id: number): void {
		this._vistas.update((list) =>
			list.map((v) => (v.id === id ? { ...v, estado: v.estado === 1 ? 0 : 1 } : v)),
		);
	}

	/** Mutación quirúrgica: eliminar 1 vista */
	removeVista(id: number): void {
		this._vistas.update((list) => list.filter((v) => v.id !== id));
	}

	setEstadisticas(stats: VistasEstadisticas): void {
		this._estadisticas.set(stats);
	}

	/** Actualización incremental de estadísticas */
	incrementarEstadistica(
		campo: keyof Omit<VistasEstadisticas, 'modulos'>,
		delta: number,
	): void {
		this._estadisticas.update((stats) => ({
			...stats,
			[campo]: Math.max(0, (stats[campo] as number) + delta),
		}));
	}

	// Pagination setters
	setPaginationData(page: number, pageSize: number, total: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(total);
	}

	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}
	// #endregion

	// #region Comandos de UI — Diálogos
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._selectedVista.set(null);
		this._formData.set({ ruta: '', nombre: '', estado: 1 });
		this._isEditing.set(false);
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}
	// #endregion

	// #region Comandos de formulario
	setSelectedVista(vista: Vista): void {
		this._selectedVista.set(vista);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	setFormData(data: VistaForm): void {
		this._formData.set(data);
	}

	updateFormField(field: keyof VistaForm, value: unknown): void {
		this._formData.update((current) => ({ ...current, [field]: value }));
	}
	// #endregion

	// #region Comandos de filtros
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterModulo(modulo: string | null): void {
		this._filterModulo.set(modulo);
	}

	setFilterEstado(estado: number | null): void {
		this._filterEstado.set(estado);
	}

	clearFiltros(): void {
		this._searchTerm.set('');
		this._filterModulo.set(null);
		this._filterEstado.set(null);
		this._page.set(1);
	}
	// #endregion
}
