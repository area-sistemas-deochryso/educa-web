import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import { searchMatchAny } from '@core/helpers';
import { EventoCalendarioLista, EventosCalendarioEstadisticas, TipoEventoCalendario } from '@data/models';
import { validateDateRange } from '@shared/models';

// #region Interfaces
export interface EventoFormData {
	titulo: string;
	descripcion: string;
	tipo: TipoEventoCalendario;
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
export class EventsCalendarStore extends BaseCrudStore<
	EventoCalendarioLista,
	EventoFormData,
	EventosCalendarioEstadisticas
> {
	constructor() {
		super({ ...EMPTY_FORM }, { total: 0, activos: 0, inactivos: 0, proximosMes: 0 });
	}

	protected override getDefaultFormData(): EventoFormData {
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
		if (!f.titulo?.trim() || !f.descripcion?.trim() || !f.fechaInicio) return false;
		// Si hay fechaFin, validar invariante fechaFin >= fechaInicio
		if (f.fechaFin) return validateDateRange(f.fechaInicio, f.fechaFin) === null;
		return true;
	});

	readonly filteredItems = computed(() => {
		let result = this.items();
		const search = this.searchTerm();
		const estado = this.filterEstado();
		const tipo = this._filterTipo();

		if (search) {
			result = result.filter((e) => searchMatchAny([e.titulo, e.descripcion], search));
		}
		if (estado !== null) {
			result = result.filter((e) => e.estado === estado);
		}
		if (tipo) {
			result = result.filter((e) => e.tipo === tipo);
		}
		return result;
	});

	/** Toggle boolean estado */
	toggleItemEstado(id: number): void {
		const item = this.items().find((e) => e.id === id);
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
