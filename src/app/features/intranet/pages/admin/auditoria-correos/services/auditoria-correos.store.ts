import { Injectable, computed, signal } from '@angular/core';

import { AuditoriaCorreoAsistenciaDto, TipoOrigenAuditoria } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditoriaCorreosStore {
	// #region Estado privado
	private readonly _items = signal<AuditoriaCorreoAsistenciaDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _tableReady = signal(false);

	private readonly _filterTipo = signal<TipoOrigenAuditoria | null>(null);
	private readonly _searchTerm = signal<string>('');
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	// #endregion

	// #region Computed
	/**
	 * Stats del universo completo — NO se recalculan al filtrar. Un filtro client-side
	 * no puede cambiar cuántos inválidos existen; solo qué se muestra.
	 */
	readonly stats = computed(() => {
		const items = this._items();
		return {
			total: items.length,
			estudiantes: items.filter((i) => i.tipoOrigen === 'Estudiante').length,
			apoderados: items.filter((i) => i.tipoOrigen === 'Apoderado').length,
			profesores: items.filter((i) => i.tipoOrigen === 'Profesor').length,
		};
	});

	readonly filteredItems = computed(() => {
		const tipo = this._filterTipo();
		const search = this._searchTerm().trim().toLowerCase();
		let items = this._items();
		if (tipo) items = items.filter((i) => i.tipoOrigen === tipo);
		if (search) {
			items = items.filter(
				(i) =>
					i.nombreCompleto.toLowerCase().includes(search) ||
					i.dni.toLowerCase().includes(search) ||
					i.correoActual.toLowerCase().includes(search),
			);
		}
		return items;
	});

	readonly hasActiveFilters = computed(
		() => this._filterTipo() !== null || this._searchTerm().trim() !== '',
	);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.filteredItems(),
		universeTotal: this._items().length,
		loading: this._loading(),
		tableReady: this._tableReady(),
		filterTipo: this._filterTipo(),
		searchTerm: this._searchTerm(),
		stats: this.stats(),
		hasActiveFilters: this.hasActiveFilters(),
	}));
	// #endregion

	// #region Comandos — Data
	setItems(items: AuditoriaCorreoAsistenciaDto[]): void {
		this._items.set(items);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}
	// #endregion

	// #region Comandos — Filtros
	setFilterTipo(tipo: TipoOrigenAuditoria | null): void {
		this._filterTipo.set(tipo);
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	clearFilters(): void {
		this._filterTipo.set(null);
		this._searchTerm.set('');
	}
	// #endregion
}
