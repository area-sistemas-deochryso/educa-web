import { Injectable, signal, computed } from '@angular/core';

import { NotificacionLista, NotificacionesEstadisticas } from '@data/models';

// #region Interfaces
export interface NotificacionFormData {
	titulo: string;
	mensaje: string;
	tipo: string;
	prioridad: string;
	icono: string;
	fechaInicio: string;
	fechaFin: string;
	actionUrl: string;
	actionText: string;
	dismissible: boolean;
	estado: boolean;
	anio: number;
}

const EMPTY_FORM: NotificacionFormData = {
	titulo: '',
	mensaje: '',
	tipo: 'evento',
	prioridad: 'medium',
	icono: 'pi-bell',
	fechaInicio: '',
	fechaFin: '',
	actionUrl: '',
	actionText: '',
	dismissible: true,
	estado: true,
	anio: new Date().getFullYear(),
};
// #endregion

@Injectable({ providedIn: 'root' })
export class NotificacionesAdminStore {
	// #region Estado privado
	private readonly _items = signal<NotificacionLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _isEditing = signal(false);
	private readonly _confirmDialogVisible = signal(false);

	private readonly _selectedItem = signal<NotificacionLista | null>(null);
	private readonly _formData = signal<NotificacionFormData>({ ...EMPTY_FORM });

	private readonly _estadisticas = signal<NotificacionesEstadisticas>({
		total: 0,
		activas: 0,
		inactivas: 0,
		vigentesHoy: 0,
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
		return !!f.titulo?.trim() && !!f.mensaje?.trim() && !!f.fechaInicio && !!f.fechaFin;
	});

	readonly filteredItems = computed(() => {
		let result = this._items();
		const search = this._searchTerm().toLowerCase();
		const estado = this._filterEstado();
		const tipo = this._filterTipo();

		if (search) {
			result = result.filter(
				(n) => n.titulo.toLowerCase().includes(search) || n.mensaje.toLowerCase().includes(search),
			);
		}
		if (estado !== null) {
			result = result.filter((n) => n.estado === estado);
		}
		if (tipo) {
			result = result.filter((n) => n.tipo === tipo);
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
	setItems(items: NotificacionLista[]): void {
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

	setEstadisticas(stats: NotificacionesEstadisticas): void {
		this._estadisticas.set(stats);
	}

	updateItem(id: number, updates: Partial<NotificacionLista>): void {
		this._items.update((list) => list.map((n) => (n.id === id ? { ...n, ...updates } : n)));
	}

	toggleItemEstado(id: number): void {
		this._items.update((list) => list.map((n) => (n.id === id ? { ...n, estado: !n.estado } : n)));
	}

	removeItem(id: number): void {
		this._items.update((list) => list.filter((n) => n.id !== id));
	}

	incrementarEstadistica(campo: keyof NotificacionesEstadisticas, delta: number): void {
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
	setFormData(data: NotificacionFormData): void {
		this._formData.set(data);
	}

	updateFormField<K extends keyof NotificacionFormData>(field: K, value: NotificacionFormData[K]): void {
		this._formData.update((current) => ({ ...current, [field]: value }));
	}

	setSelectedItem(item: NotificacionLista): void {
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
