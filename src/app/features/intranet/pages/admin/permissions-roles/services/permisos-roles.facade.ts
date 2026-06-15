import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, facadeErrorHandler } from '@core/helpers';
import {
	ErrorHandlerService,
	PermissionsService,
	RolCapabilityMatrixRow,
	SwService,
	WalCrossTabRefetchService,
	WalFacadeHelper,
} from '@core/services';
import { environment } from '@config';
import { UI_SUMMARIES } from '@app/shared/constants';
import { buildModuloCapabilities } from '../helpers/permisos-modulos.utils';

import { PermissionsRolesStore } from './permisos-roles.store';

@Injectable({ providedIn: 'root' })
export class PermissionsRolesFacade {
	// #region Dependencies
	private api = inject(PermissionsService);
	private store = inject(PermissionsRolesStore);
	private wal = inject(WalFacadeHelper);
	private swService = inject(SwService);
	private errorHandler = inject(ErrorHandlerService);
	private crossTabRefetch = inject(WalCrossTabRefetchService);
	private destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/admin/capabilities`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'PermisosRolesFacade',
		errorHandler: this.errorHandler,
	});
	// #endregion

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'rolCapabilities',
			refetchItems: () => this.silentRefresh(),
			destroyRef: this.destroyRef,
		});
	}

	readonly vm = this.store.vm;

	// #region Load
	loadAll(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			catalog: this.api.getCapabilityCatalog(),
			matrix: this.api.getRolCapabilityMatrix(),
		})
			.pipe(
				withRetry({ tag: 'PermisosRolesFacade:loadAll' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ catalog, matrix }) => {
					this.store.setCatalog(catalog);
					this.store.setMatrixRows(matrix);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error loading role capabilities:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudieron cargar las capabilities por rol');
					this.store.setError('No se pudieron cargar las capabilities por rol');
					this.store.setLoading(false);
				},
			});
	}

	// #endregion

	// #region Save
	saveCapabilities(): void {
		const row = this.store.selectedRow();
		if (!row) return;

		const capabilityIds = this.store.selectedCapIds();
		const previousIds = [...row.capabilityIds];

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'rolCapabilities',
			resourceId: row.rolId,
			endpoint: `${this.apiUrl}/roles/${row.rolId}/capabilities`,
			method: 'PUT',
			payload: { capabilityIds },
			http$: () => this.api.setRolCapabilities(row.rolId, { capabilityIds }),
			onCommit: () => {
				this.errorHandler.showSuccess(UI_SUMMARIES.success, 'Capabilities del rol actualizadas');
				this.silentRefresh();
			},
			onError: (err) => this.errHandler.handle(err, 'actualizar capabilities del rol'),
			optimistic: {
				apply: () => {
					this.store.updateRowCapabilities(row.rolId, capabilityIds);
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.updateRowCapabilities(row.rolId, previousIds);
				},
			},
		});
	}
	// #endregion

	// #region Refresh
	refresh(): void {
		this.swService.invalidateCacheByPattern('/capabilities').then(() => {
			this.loadAll();
		});
	}

	private silentRefresh(): void {
		forkJoin({
			catalog: this.api.getCapabilityCatalog(),
			matrix: this.api.getRolCapabilityMatrix(),
		})
			.pipe(
				withRetry({ tag: 'PermisosRolesFacade:silentRefresh' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ catalog, matrix }) => {
					this.store.setCatalog(catalog);
					this.store.setMatrixRows(matrix);
				},
				error: (err) => {
					logger.error('Error refreshing role capabilities:', err);
				},
			});
	}
	// #endregion

	// #region UI commands
	openEditDialog(row: RolCapabilityMatrixRow): void {
		this.store.setSelectedRow(row);
		this.store.setSelectedCapIds([...row.capabilityIds]);
		this.store.setIsEditing(true);
		const modulos = buildModuloCapabilities(this.store.catalog(), row.capabilityIds);
		this.store.setModulosCapabilities(modulos);
		this.store.openDialog();
	}

	openDetail(row: RolCapabilityMatrixRow): void {
		this.store.openDetailDrawer(row);
	}

	closeDetail(): void {
		this.store.closeDetailDrawer();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	editFromDetail(): void {
		const row = this.store.selectedRow();
		if (row) {
			this.closeDetail();
			this.openEditDialog(row);
		}
	}
	// #endregion

	// #region Form commands
	setActiveModuloIndex(index: number): void {
		this.store.setActiveModuloIndex(index);
	}

	setCapBusqueda(term: string): void {
		this.store.setCapBusqueda(term);
	}

	toggleCapability(capId: number): void {
		this.store.toggleCapability(capId);
	}

	toggleAllCapabilitiesModulo(): void {
		this.store.toggleAllCapabilitiesModulo();
	}
	// #endregion
}
