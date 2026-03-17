import { Injectable, signal, computed } from '@angular/core';

import { EventoCalendarioLista, EventosCalendarioEstadisticas } from '@core/services/eventos-calendario';

// #region Interfaces
export interface EventoFormData {
	titulo: string;
	descripcion: string;
	tipo: string;
	icono: string;
	fechaInicio: string;
	fechaFin: string;
	hora: string;
	ubicacion: string;
	estado: boolean;
	anio: number;
}

const EMPTY_FORM: EventoFormData = {
	titulo: '',
	descripcion: '',
	tipo: 'academic',
	icono: 'pi-calendar',
	fechaInicio: '',
	fechaFin: '',
	hora: '',
	ubicacion: '',
	estado: true,
	anio: new Date().getFullYear(),
};
// #endregion

@Injectable({ providedIn: 'root' })
export class EventosCalendarioStore {
	// #region Estado privado
	private readonly _items = signal<EventoCalendarioLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _isEditing = signal(false);
	private readonly _confirmDialogVisible = signal(false);

	private readonly _selectedItem = signal<EventoCalendarioLista | null>(null);
	private readonly _formData = signal<EventoFormData>({ ...EMPTY_FORM });

	private readonly _estadisticas = signal<EventosCalendarioEstadisticas>({
		total: 0,
		activos: 0,
		inactivos: 0,
		proximosMes: 0,
	});

	private readonly _searchTerm = signal('');
	private readonly _filterEstado = signal<boolean | null>(null);
	private readonly _filterTipo = signal<string | null>(null);
	private readonly _filterAnio = signal(new Date().getFullYear());
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();

	readonly selectedItem = this._selectedItem.asReadonly();
	readonly formData = this._formData.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();

	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterAnio = this._filterAnio.asReadonly();
	// #endregion

	// #region Computed
	readonly isFormValid = computed(() => {
		const f = this._formData();
		return !!f.titulo?.trim() && !!f.descripcion?.trim() && !!f.fechaInicio;
	});

	readonly filteredItems = computed(() => {
		let result = this._items();
		const search = this._searchTerm().toLowerCase();
		const estado = this._filterEstado();
		const tipo = this._filterTipo();

		if (search) {
			result = result.filter(
				(e) => e.titulo.toLowerCase().includes(search) || e.descripcion.toLowerCase().includes(search),
			);
		}
		if (estado !== null) {
			result = result.filter((e) => e.estado === estado);
		}
		if (tipo) {
			result = result.filter((e) => e.tipo === tipo);
		}
		return result;
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.filteredItems(),
		loading: this._loading(),
		error: this._error(),
		estadisticas: this._estadisticas(),

		dialogVisible: this._dialogVisible(),
		isEditing: this._isEditing(),
		confirmDialogVisible: this._confirmDialogVisible(),

		selectedItem: this._selectedItem(),
		formData: this._formData(),
		isFormValid: this.isFormValid(),

		searchTerm: this._searchTerm(),
		filterEstado: this._filterEstado(),
		filterTipo: this._filterTipo(),
		filterAnio: this._filterAnio(),
	}));
	// #endregion

	// #region Comandos de datos
	setItems(items: EventoCalendarioLista[]): void {
		this._items.set(items);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}

	setEstadisticas(stats: EventosCalendarioEstadisticas): void {
		this._estadisticas.set(stats);
	}

	updateItem(id: number, updates: Partial<EventoCalendarioLista>): void {
		this._items.update((list) => list.map((e) => (e.id === id ? { ...e, ...updates } : e)));
	}

	toggleItemEstado(id: number): void {
		this._items.update((list) => list.map((e) => (e.id === id ? { ...e, estado: !e.estado } : e)));
	}

	removeItem(id: number): void {
		this._items.update((list) => list.filter((e) => e.id !== id));
	}

	incrementarEstadistica(campo: keyof EventosCalendarioEstadisticas, delta: number): void {
		this._estadisticas.update((stats) => ({
			...stats,
			[campo]: Math.max(0, stats[campo] + delta),
		}));
	}
	// #endregion

	// #region Comandos de UI
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._selectedItem.set(null);
		this._formData.set({ ...EMPTY_FORM, anio: this._filterAnio() });
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
	setFormData(data: EventoFormData): void {
		this._formData.set(data);
	}

	updateFormField<K extends keyof EventoFormData>(field: K, value: EventoFormData[K]): void {
		this._formData.update((current) => ({ ...current, [field]: value }));
	}

	setSelectedItem(item: EventoCalendarioLista): void {
		this._selectedItem.set(item);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}
	// #endregion

	// #region Comandos de filtros
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterEstado(estado: boolean | null): void {
		this._filterEstado.set(estado);
	}

	setFilterTipo(tipo: string | null): void {
		this._filterTipo.set(tipo);
	}

	setFilterAnio(anio: number): void {
		this._filterAnio.set(anio);
	}

	clearFiltros(): void {
		this._searchTerm.set('');
		this._filterEstado.set(null);
		this._filterTipo.set(null);
	}
	// #endregion
}
