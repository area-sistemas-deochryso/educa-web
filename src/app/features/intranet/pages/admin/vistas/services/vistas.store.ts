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
	ruta: string;
}

interface CapabilityStats {
	total: number;
	totalModulos: number;
	modulos: string[];
}

export interface CatalogItemWithRoute extends CapabilityCatalogItem {
	segmento: 'admin' | 'profesor' | 'estudiante' | 'compartido' | null;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class VistasStore extends BaseCrudStore<CapabilityCatalogItem, CapabilityForm, CapabilityStats> {
	constructor() {
		super(
			{ codigo: '', nombre: '', modulo: '', descripcion: '', ruta: '' },
			{ total: 0, totalModulos: 0, modulos: [] },
		);
	}

	protected override getDefaultFormData(): CapabilityForm {
		return { codigo: '', nombre: '', modulo: '', descripcion: '', ruta: '' };
	}

	// #region Filtros
	private readonly _filterModulo = signal<string | null>(null);
	readonly filterModulo = this._filterModulo.asReadonly();

	private readonly _filterRuta = signal<'all' | 'with' | 'without'>('all');
	readonly filterRuta = this._filterRuta.asReadonly();

	setFilterModulo(modulo: string | null): void {
		this._filterModulo.set(modulo);
	}

	setFilterRuta(value: 'all' | 'with' | 'without'): void {
		this._filterRuta.set(value);
	}

	protected override onClearFiltros(): void {
		this._filterModulo.set(null);
		this._filterRuta.set('all');
	}

	readonly rutaFilterOptions = [
		{ label: 'Todas', value: 'all' },
		{ label: 'Con ruta', value: 'with' },
		{ label: 'Sin ruta', value: 'without' },
	];
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

	readonly editingRoute = computed(() => {
		return this.formData().ruta || null;
	});

	readonly isFormValid = computed(() => {
		const data = this.formData();
		return !!(data.codigo?.trim() && data.nombre?.trim() && data.modulo?.trim());
	});

	readonly itemsWithRoute = computed<CatalogItemWithRoute[]>(() =>
		this.items().map((item) => {
			const ruta = item.ruta ?? null;
			let segmento: CatalogItemWithRoute['segmento'] = null;
			if (ruta) {
				const parts = ruta.split('/');
				if (parts[1] === 'admin') segmento = 'admin';
				else if (parts[1] === 'profesor') segmento = 'profesor';
				else if (parts[1] === 'estudiante') segmento = 'estudiante';
				else segmento = 'compartido';
			}
			return { ...item, segmento };
		}),
	);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.itemsWithRoute(),
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
		saving: this.saving(),
		editingRoute: this.editingRoute(),

		modulosOptions: this.modulosOptions(),
		searchTerm: this.searchTerm(),
		filterModulo: this.filterModulo(),
		filterRuta: this.filterRuta(),
		rutaFilterOptions: this.rutaFilterOptions,
		confirmDialogVisible: this.confirmDialogVisible(),
	}));
	// #endregion
}
