import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import { searchMatchAny } from '@core/helpers';
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
export class NotificacionesAdminStore extends BaseCrudStore<
	NotificacionLista,
	NotificacionFormData,
	NotificacionesEstadisticas
> {
	constructor() {
		super({ ...EMPTY_FORM }, { total: 0, activas: 0, inactivas: 0, vigentesHoy: 0 });
	}

	protected override getDefaultFormData(): NotificacionFormData {
		return { ...EMPTY_FORM, anio: this._filterAnio() };
	}

	// #region Estado específico — Filtros
	private readonly _filterTipo = signal<string | null>(null);
	readonly _filterAnio = signal(new Date().getFullYear());
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterAnio = this._filterAnio.asReadonly();

	setFilterTipo(tipo: string | null): void {
		this._filterTipo.set(tipo);
	}

	setFilterAnio(anio: number): void {
		this._filterAnio.set(anio);
	}

	protected override onClearFiltros(): void {
		this._filterTipo.set(null);
	}
	// #endregion

	// #region Computed específicos
	readonly isFormValid = computed(() => {
		const f = this.formData();
		return !!f.titulo?.trim() && !!f.mensaje?.trim() && !!f.fechaInicio && !!f.fechaFin;
	});

	readonly filteredItems = computed(() => {
		let result = this.items();
		const search = this.searchTerm();
		const estado = this.filterEstado();
		const tipo = this._filterTipo();

		if (search) {
			result = result.filter((n) => searchMatchAny([n.titulo, n.mensaje], search));
		}
		if (estado !== null) {
			result = result.filter((n) => n.estado === estado);
		}
		if (tipo) {
			result = result.filter((n) => n.tipo === tipo);
		}
		return result;
	});

	/** Toggle boolean estado */
	toggleItemEstado(id: number): void {
		const item = this.items().find((n) => n.id === id);
		if (item) this.updateItem(id, { estado: !item.estado });
	}
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.filteredItems(),
		loading: this.loading(),
		error: this.error(),
		estadisticas: this.estadisticas()!,

		dialogVisible: this.dialogVisible(),
		isEditing: this.isEditing(),
		confirmDialogVisible: this.confirmDialogVisible(),

		selectedItem: this.selectedItem(),
		formData: this.formData(),
		isFormValid: this.isFormValid(),

		searchTerm: this.searchTerm(),
		filterEstado: this.filterEstado(),
		filterTipo: this.filterTipo(),
		filterAnio: this.filterAnio(),
	}));
	// #endregion
}
