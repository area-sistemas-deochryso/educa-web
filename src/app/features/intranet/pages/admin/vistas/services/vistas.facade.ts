import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
	BaseCrudFacade,
	type BaseCrudFacadeConfig,
	type PaginatedResult,
	PermissionsService,
	CapabilityCatalogItem,
} from '@core/services';
import { environment } from '@config';

import { VistasStore } from './vistas.store';

interface CapabilityStats { total: number; totalModulos: number; modulos: string[] }

@Injectable({ providedIn: 'root' })
export class VistasFacade extends BaseCrudFacade<CapabilityCatalogItem, { codigo: string; nombre: string; modulo: string; descripcion: string }, CapabilityStats> {
	private readonly api = inject(PermissionsService);
	protected readonly store = inject(VistasStore);
	protected readonly config: BaseCrudFacadeConfig = {
		tag: 'VistasFacade',
		resourceType: 'capabilities',
		apiUrl: `${environment.apiUrl}/api/admin/capabilities`,
		loadErrorMessage: 'No se pudieron cargar las capabilities',
	};

	readonly vm = this.store.vm;

	constructor() {
		super();
		this.initErrorHandler();
		this.initCrossTabRefetch();
	}

	// #region API calls
	protected fetchItems(): Observable<PaginatedResult<CapabilityCatalogItem>> {
		return this.api.getCapabilityCatalog().pipe(
			map((items) => ({
				data: items,
				page: 1,
				pageSize: items.length || 50,
				total: items.length,
			})),
		);
	}

	protected fetchEstadisticas(): Observable<CapabilityStats> {
		return this.api.getCapabilityCatalog().pipe(
			map((items) => {
				const modulos = [...new Set(items.map((c) => c.modulo))];
				return { total: items.length, totalModulos: modulos.length, modulos };
			}),
		);
	}
	// #endregion

	// #region CRUD commands
	saveCapability(): void {
		const formData = this.store.formData();

		if (this.store.isEditing()) {
			const cap = this.store.selectedItem();
			if (!cap) return;
			const payload = { nombre: formData.nombre, modulo: formData.modulo, descripcion: formData.descripcion };
			this.walUpdate(cap.id, payload, { ...formData },
				() => this.api.updateCapability(cap.id, payload),
				`catalog/${cap.id}`,
			);
		} else {
			const payload = { codigo: formData.codigo, nombre: formData.nombre, modulo: formData.modulo, descripcion: formData.descripcion };
			this.walCreate(payload, () => this.api.createCapability(payload), 'catalog');
		}
	}

	delete(cap: CapabilityCatalogItem): void {
		this.walDelete(cap,
			() => this.api.deleteCapability(cap.id),
			{ total: 'total', activos: 'total', inactivos: 'total' },
			`catalog/${cap.id}`,
			'hard',
		);
	}
	// #endregion

	// #region UI commands
	openEditDialog(cap: CapabilityCatalogItem): void {
		this.store.setSelectedItem(cap);
		this.store.setFormData({ codigo: cap.codigo, nombre: cap.nombre, modulo: cap.modulo, descripcion: cap.descripcion ?? '' });
		this.store.setIsEditing(true);
		this.store.openDialog();
	}

	updateFormField(field: 'codigo' | 'nombre' | 'modulo' | 'descripcion', value: string): void {
		this.store.updateFormField(field, value as never);
	}
	// #endregion

	// #region Filtros
	setFilterModulo(modulo: string | null): void {
		this.store.setFilterModulo(modulo);
		this.store.setPage(1);
		this.refreshItemsOnly();
	}
	// #endregion

	// #region Error labels
	protected override getCreateErrorLabel(): string { return 'crear la capability'; }
	protected override getUpdateErrorLabel(): string { return 'actualizar la capability'; }
	protected override getDeleteErrorLabel(): string { return 'eliminar la capability'; }
	// #endregion
}
