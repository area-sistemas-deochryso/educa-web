import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
	BaseCrudFacade,
	type BaseCrudFacadeConfig,
	type EstadisticaKeys,
	type PaginatedResult,
	PermisosService,
	Vista,
} from '@core/services';
import { environment } from '@config';

import { VistasStore } from './vistas.store';

interface VistasEstadisticas { totalVistas: number; vistasActivas: number; vistasInactivas: number }

const STATS_KEYS: EstadisticaKeys = { total: 'totalVistas', activos: 'vistasActivas', inactivos: 'vistasInactivas' };

@Injectable({ providedIn: 'root' })
export class VistasFacade extends BaseCrudFacade<Vista, { ruta: string; nombre: string; estado: number }, VistasEstadisticas> {
	// #region Dependencias específicas
	private readonly api = inject(PermisosService);
	protected readonly store = inject(VistasStore);
	protected readonly config: BaseCrudFacadeConfig = {
		tag: 'VistasFacade',
		resourceType: 'Vista',
		apiUrl: `${environment.apiUrl}/api/sistema/permisos`,
		loadErrorMessage: 'No se pudieron cargar las vistas',
	};
	// #endregion

	constructor() {
		super();
		this.initErrorHandler();
	}

	// #region API calls (abstract implementations)
	protected fetchItems(): Observable<PaginatedResult<Vista>> {
		return this.api.getVistasPaginated(
			this.store.page(),
			this.store.pageSize(),
			this.store.searchTerm() || undefined,
			this.store.filterModulo() || undefined,
			this.store.filterEstado() as number | null,
		);
	}

	protected fetchEstadisticas(): Observable<VistasEstadisticas> {
		return this.api.getVistasEstadisticas();
	}
	// #endregion

	// #region CRUD commands
	saveVista(): void {
		const formData = this.store.formData();

		if (this.store.isEditing()) {
			const vista = this.store.selectedItem();
			if (!vista) return;
			const payload = { ruta: formData.ruta, nombre: formData.nombre, estado: formData.estado, rowVersion: vista.rowVersion };
			this.walUpdate(vista.id, payload, { ruta: formData.ruta, nombre: formData.nombre, estado: formData.estado },
				() => this.api.actualizarVista(vista.id, payload),
			);
		} else {
			const payload = { ruta: formData.ruta, nombre: formData.nombre };
			this.walCreate(payload, () => this.api.crearVista(payload), 'vistas/crear');
		}
	}

	toggleEstado(vista: Vista): void {
		const nuevoEstado = vista.estado === 1 ? 0 : 1;
		const payload = { ruta: vista.ruta, nombre: vista.nombre, estado: nuevoEstado, rowVersion: vista.rowVersion };
		this.walToggle(vista, payload,
			() => this.api.actualizarVista(vista.id, payload),
			STATS_KEYS,
			(id) => this.store.toggleVistaEstado(id),
			`vistas/${vista.id}/actualizar`,
		);
	}

	delete(vista: Vista): void {
		this.walDelete(vista,
			() => this.api.eliminarVista(vista.id),
			STATS_KEYS,
			`vistas/${vista.id}/eliminar`,
		);
	}
	// #endregion

	// #region UI commands (specific)
	openEditDialog(vista: Vista): void {
		this.store.setSelectedItem(vista);
		this.store.setFormData({ ruta: vista.ruta, nombre: vista.nombre, estado: vista.estado ?? 1 });
		this.store.setIsEditing(true);
		this.store.openDialog();
	}

	updateFormField(field: 'ruta' | 'nombre' | 'estado', value: string | number): void {
		this.store.updateFormField(field, value as never);
	}
	// #endregion

	// #region Filtros específicos
	setFilterModulo(modulo: string | null): void {
		this.store.setFilterModulo(modulo);
		this.store.setPage(1);
		this.refreshItemsOnly();
	}
	// #endregion

	// #region Error labels
	protected override getCreateErrorLabel(): string { return 'guardar la vista'; }
	protected override getUpdateErrorLabel(): string { return 'guardar la vista'; }
	protected override getDeleteErrorLabel(): string { return 'eliminar la vista'; }
	// #endregion
}
