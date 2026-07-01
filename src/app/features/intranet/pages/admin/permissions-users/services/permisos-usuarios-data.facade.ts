import { Injectable, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, facadeErrorHandler } from '@core/helpers';
import {
	PermissionsService,
	ErrorHandlerService,
	SwService,
	WalCrossTabRefetchService,
	WalFacadeHelper,
	UsuarioBusqueda,
} from '@core/services';
import { environment } from '@config';
import { UI_SUMMARIES } from '@app/shared/constants';

import { PermissionsUsersStore } from './permisos-usuarios.store';

@Injectable({ providedIn: 'root' })
export class PermissionsUsersDataFacade {
	private store = inject(PermissionsUsersStore);
	private api = inject(PermissionsService);
	private wal = inject(WalFacadeHelper);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private crossTabRefetch = inject(WalCrossTabRefetchService);
	private destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/admin/capabilities`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'PermisosUsuariosFacade',
		errorHandler: this.errorHandler,
	});

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'usuarioCapabilities',
			refetchItems: () => this.loadCatalogAndMatrix(),
			destroyRef: this.destroyRef,
		});
	}

	readonly vm = this.store.vm;

	// #region Load
	loadCatalogAndMatrix(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			catalog: this.api.getCapabilityCatalog(),
			matrix: this.api.getRolCapabilityMatrix(),
		})
			.pipe(
				withRetry({ tag: 'PermisosUsuariosFacade:loadAll' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ catalog, matrix }) => {
					this.store.setCatalog(catalog);
					this.store.setMatrixRows(matrix);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error loading capabilities data:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudieron cargar los datos de capabilities');
					this.store.setError('No se pudieron cargar los datos');
					this.store.setLoading(false);
				},
			});
	}

	refresh(): void {
		this.swService.invalidateCacheByPattern('/capabilities').then(() => {
			this.loadCatalogAndMatrix();
		});
	}
	// #endregion

	// #region User search
	searchUsers(termino: string, rol?: string): void {
		this.api.searchUsers(termino || undefined, rol)
			.pipe(
				withRetry({ tag: 'PermisosUsuariosFacade:searchUsers' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => this.store.setUsuariosSugeridos(result.usuarios),
				error: (err) => {
					logger.error('Error searching users:', err);
					this.store.setUsuariosSugeridos([]);
				},
			});
	}

	selectUsuario(usuario: UsuarioBusqueda): void {
		this.store.setSelectedUsuario(usuario);
	}

	setSelectedRolId(rolId: number | null): void {
		this.store.setSelectedRolId(rolId);
		if (rolId && this.store.selectedUsuario()) {
			this.loadOverview();
		}
	}
	// #endregion

	// #region Overview
	loadOverview(): void {
		const usuario = this.store.selectedUsuario();
		const rolId = this.store.selectedRolId();
		if (!usuario || !rolId) return;

		this.store.setLoading(true);
		this.api.getUsuarioCapabilityOverview(usuario.id, rolId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (overview) => {
					this.store.setOverview(overview);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error loading user overview:', err);
					this.store.setOverview(null);
					this.store.setLoading(false);
				},
			});
	}
	// #endregion

	// #region Save
	saveOverrides(onSettled?: () => void): void {
		const usuario = this.store.selectedUsuario();
		const rolId = this.store.selectedRolId();
		if (!usuario || !rolId) return;

		const grants = this.store.grantIds();
		const denies = this.store.denyIds();

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'usuarioCapabilities',
			resourceId: usuario.id,
			endpoint: `${this.apiUrl}/users/${usuario.id}/rol/${rolId}`,
			method: 'PUT',
			payload: { grants, denies },
			http$: () => this.api.setUsuarioCapabilities(usuario.id, rolId, { grants, denies }),
			onCommit: () => {
				this.errorHandler.showSuccess(UI_SUMMARIES.success, 'Overrides del usuario actualizados');
				this.store.closeDialog();
				this.loadOverview();
				onSettled?.();
			},
			onError: (err) => {
				this.errHandler.handle(err, 'guardar overrides del usuario');
				onSettled?.();
			},
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => this.store.openDialog(),
			},
		});
	}
	// #endregion

	// #region UI
	openEditDialog(): void {
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	toggleGrant(capId: number): void {
		this.store.toggleGrant(capId);
	}

	toggleDeny(capId: number): void {
		this.store.toggleDeny(capId);
	}

	setActiveModuloIndex(index: number): void {
		this.store.setActiveModuloIndex(index);
	}

	setCapBusqueda(term: string): void {
		this.store.setCapBusqueda(term);
	}

	resetSelection(): void {
		this.store.resetSelection();
	}
	// #endregion
}
