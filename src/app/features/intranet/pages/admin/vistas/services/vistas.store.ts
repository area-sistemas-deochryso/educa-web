import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import { CapabilityCatalogItem } from '@core/services';
import { capitalize } from '@core/helpers';
import { withAllOption, SelectOption } from '@shared/models';

// #region Interfaces
interface CapabilityForm {
	codigo: string;
	nombre: string;
	modulo: string;
	descripcion: string;
}

interface CapabilityStats {
	total: number;
	totalModulos: number;
	modulos: string[];
}
// #endregion

@Injectable({ providedIn: 'root' })
export class VistasStore extends BaseCrudStore<CapabilityCatalogItem, CapabilityForm, CapabilityStats> {
	constructor() {
		super(
			{ codigo: '', nombre: '', modulo: '', descripcion: '' },
			{ total: 0, totalModulos: 0, modulos: [] },
		);
	}

	protected override getDefaultFormData(): CapabilityForm {
		return { codigo: '', nombre: '', modulo: '', descripcion: '' };
	}

	// #region Filtro módulo
	private readonly _filterModulo = signal<string | null>(null);
	readonly filterModulo = this._filterModulo.asReadonly();

	setFilterModulo(modulo: string | null): void {
		this._filterModulo.set(modulo);
	}

	protected override onClearFiltros(): void {
		this._filterModulo.set(null);
	}
	// #endregion

	// #region Computed
	readonly modulosOptions = computed(() => {
		const modulos = this.estadisticas()?.modulos ?? [];
		const options: SelectOption<string>[] = modulos.map((m) => ({
			label: capitalize(m),
			value: m,
		}));
		return withAllOption(options, 'Todos los módulos');
	});

	readonly isFormValid = computed(() => {
		const data = this.formData();
		return !!(data.codigo?.trim() && data.nombre?.trim() && data.modulo?.trim());
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.items(),
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
		confirmDialogVisible: this.confirmDialogVisible(),
	}));
	// #endregion
}
