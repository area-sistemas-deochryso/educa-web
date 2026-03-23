import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import { Vista, VistasEstadisticas } from '@core/services';

// #region Interfaces
interface VistaForm {
	ruta: string;
	nombre: string;
	estado: number;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class VistasStore extends BaseCrudStore<Vista, VistaForm, VistasEstadisticas> {
	constructor() {
		super(
			{ ruta: '', nombre: '', estado: 1 },
			{ totalVistas: 0, vistasActivas: 0, vistasInactivas: 0, totalModulos: 0, modulos: [] },
		);
	}

	protected override getDefaultFormData(): VistaForm {
		return { ruta: '', nombre: '', estado: 1 };
	}

	// #region Estado específico — Filtro módulo
	private readonly _filterModulo = signal<string | null>(null);
	readonly filterModulo = this._filterModulo.asReadonly();

	setFilterModulo(modulo: string | null): void {
		this._filterModulo.set(modulo);
	}

	protected override onClearFiltros(): void {
		this._filterModulo.set(null);
	}
	// #endregion

	// #region Computed específicos
	readonly modulosOptions = computed(() => {
		const modulos = this.estadisticas()?.modulos ?? [];
		return [{ label: 'Todos los modulos', value: null as string | null }].concat(
			modulos.map((m) => ({
				label: m.charAt(0).toUpperCase() + m.slice(1),
				value: m as string | null,
			})),
		);
	});

	readonly isFormValid = computed(() => {
		const data = this.formData();
		return !!(data.ruta?.trim() && data.nombre?.trim());
	});
	// #endregion

	// #region Mutaciones específicas — Toggle numérico (estado: 0/1)
	/** Toggle numérico (0/1) — Vista usa estado numérico, no boolean */
	toggleVistaEstado(id: number): void {
		const vista = this.items().find((v) => v.id === id);
		if (vista) {
			this.updateItem(id, { estado: vista.estado === 1 ? 0 : 1 });
		}
	}
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		vistas: this.items(),
		loading: this.loading(),
		error: this.error(),
		estadisticas: this.estadisticas()!,

		page: this.page(),
		pageSize: this.pageSize(),
		totalRecords: this.totalRecords(),

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
}
