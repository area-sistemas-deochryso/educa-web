import { Injectable, DestroyRef, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, facadeErrorHandler } from '@core/helpers';
import {
	PermisosService,
	PermisoUsuario,
	RolTipoAdmin,
	UsuarioBusqueda,
	ErrorHandlerService,
	SwService,
	WalFacadeHelper,
} from '@core/services';
import { environment } from '@config';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { UiMappingService } from '@shared/services';
import { PermisosUsuariosStore } from './permisos-usuarios.store';
import { PermisosUsuariosHelperService } from './permisos-usuarios-helper.service';

@Injectable({ providedIn: 'root' })
export class PermisosUsuariosFacade {
	private store = inject(PermisosUsuariosStore);
	private permisosService = inject(PermisosService);
	private helperService = inject(PermisosUsuariosHelperService);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private wal = inject(WalFacadeHelper);
	readonly uiMapping = inject(UiMappingService);
	private destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/permisos`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'PermisosUsuariosFacade',
		errorHandler: this.errorHandler,
	});

	// ViewModel
	readonly vm = this.store.vm;

	// Estado público readonly desde el store
	readonly permisosUsuario = this.store.permisosUsuario;
	readonly permisosRol = this.store.permisosRol;
	readonly vistas = this.store.vistas;
	readonly loading = this.store.loading;
	readonly searchTerm = this.store.searchTerm;
	readonly filterRol = this.store.filterRol;
	readonly dialogVisible = this.store.dialogVisible;
	readonly detailDrawerVisible = this.store.detailDrawerVisible;
	readonly isEditing = this.store.isEditing;
	readonly selectedPermiso = this.store.selectedPermiso;
	readonly selectedUsuarioId = this.store.selectedUsuarioId;
	readonly selectedRol = this.store.selectedRol;
	readonly selectedVistas = this.store.selectedVistas;
	readonly modulosVistas = this.store.modulosVistas;
	readonly activeModuloIndex = this.store.activeModuloIndex;
	readonly vistasBusqueda = this.store.vistasBusqueda;
	readonly filteredPermisos = this.store.filteredPermisos;
	readonly usuariosSugeridos = this.store.usuariosSugeridos;
	readonly vistasFiltradas = this.store.vistasFiltradas;
	readonly isAllModuloSelected = this.store.isAllModuloSelected;

	// Computed - Statistics
	readonly totalUsuarios = computed(() => this.permisosUsuario().length);

	readonly totalModulos = computed(() => {
		const modulos = new Set<string>();
		this.vistas().forEach((v) => {
			const modulo = this.uiMapping.getModuloFromRuta(v.ruta);
			modulos.add(modulo);
		});
		return modulos.size;
	});

	// Computed - Vistas count label
	readonly vistasCountLabel = computed(() =>
		this.helperService.getVistasCountLabel(this.selectedVistas().length),
	);

	// Computed - Módulos para detail drawer
	readonly moduloVistasForDetail = computed(() => {
		const permiso = this.selectedPermiso();
		if (!permiso) return [];

		return this.helperService.buildModulosVistasForDetail(this.vistas(), permiso.vistas);
	});

	// #region Data Loading
	loadData(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			vistas: this.permisosService.getVistas(),
			permisosRol: this.permisosService.getPermisosRol(),
			permisosUsuario: this.permisosService.getPermisosUsuario(),
		})
			.pipe(
				withRetry({ tag: 'PermisosUsuariosFacade:loadData' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ vistas, permisosRol, permisosUsuario }) => {
					this.store.setVistas(vistas.filter((v) => v.estado === 1));
					// Filtrar apoderados para no mostrarlos en admin
					this.store.setPermisosRol(permisosRol.filter((p) => p.rol !== 'Apoderado'));
					this.store.setPermisosUsuario(
						permisosUsuario.filter((p) => p.rol !== 'Apoderado'),
					);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadPermisos,
					);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadPermisos);
					this.store.setLoading(false);
				},
			});
	}

	refresh(): void {
		this.swService.invalidateCacheByPattern('/permisos').then(() => {
			this.loadData();
		});
	}

	/** Refetch silencioso post-CRUD: el interceptor ya invalidó el cache del SW. */
	private silentRefreshAfterCrud(): void {
		this.loadData();
	}

	// #endregion
	// #region Filters
	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
	}

	setFilterRol(rol: RolTipoAdmin | null): void {
		this.store.setFilterRol(rol);
	}

	clearFilters(): void {
		this.store.clearFilters();
	}

	// #endregion
	// #region Detail Drawer
	openDetail(permiso: PermisoUsuario): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setDetailDrawerVisible(true);
	}

	closeDetail(): void {
		this.store.setDetailDrawerVisible(false);
	}

	// #endregion
	// #region Edit Dialog
	openNew(): void {
		this.store.resetDialogState();
		const modulos = this.helperService.buildModulosVistas(this.vistas(), []);
		this.store.setModulosVistas(modulos);
		this.store.setDialogVisible(true);
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setSelectedUsuarioId(permiso.usuarioId);
		this.store.setSelectedRol(permiso.rol as RolTipoAdmin);
		this.store.setSelectedVistas([...permiso.vistas]);
		this.store.setIsEditing(true);

		const modulos = this.helperService.buildModulosVistas(this.vistas(), permiso.vistas);
		this.store.setModulosVistas(modulos);
		this.store.setDialogVisible(true);
	}

	editFromDetail(): void {
		const permiso = this.selectedPermiso();
		if (permiso) {
			this.closeDetail();
			this.editPermiso(permiso);
		}
	}

	hideDialog(): void {
		this.store.setDialogVisible(false);
		this.store.setVistasBusqueda('');
		this.store.setActiveModuloIndex(0);
	}

	savePermiso(): void {
		const vistas = this.selectedVistas();

		if (this.isEditing()) {
			const permiso = this.selectedPermiso();
			if (!permiso) return;

			const payload = { vistas, rowVersion: permiso.rowVersion };

			this.wal.execute({
				operation: 'UPDATE',
				resourceType: 'PermisoUsuario',
				resourceId: permiso.id,
				endpoint: `${this.apiUrl}/usuario/${permiso.id}/actualizar`,
				method: 'PUT',
				payload,
				http$: () => this.permisosService.actualizarPermisoUsuario(permiso.id, payload),
				optimistic: {
					apply: () => this.hideDialog(),
					rollback: () => {},
				},
				onCommit: () => this.silentRefreshAfterCrud(),
				onError: (err) => this.errHandler.handle(err, 'guardar el permiso'),
			});
		} else {
			const usuarioId = this.selectedUsuarioId();
			const rol = this.selectedRol();
			if (!usuarioId || !rol) return;

			const payload = { usuarioId, rol, vistas };

			this.wal.execute({
				operation: 'CREATE',
				resourceType: 'PermisoUsuario',
				endpoint: `${this.apiUrl}/usuario/crear`,
				method: 'POST',
				payload,
				http$: () => this.permisosService.crearPermisoUsuario(payload),
				optimistic: {
					apply: () => this.hideDialog(),
					rollback: () => {},
				},
				onCommit: () => this.silentRefreshAfterCrud(),
				onError: (err) => this.errHandler.handle(err, 'guardar el permiso'),
			});
		}
	}

	deletePermiso(id: number): void {
		const snapshot = this.permisosUsuario().find((p) => p.id === id);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'PermisoUsuario',
			resourceId: id,
			endpoint: `${this.apiUrl}/usuario/${id}/eliminar`,
			method: 'DELETE',
			payload: null,
			http$: () => this.permisosService.eliminarPermisoUsuario(id),
			optimistic: {
				apply: () => this.store.removePermisoUsuario(id),
				rollback: () => {
					if (snapshot) this.store.addPermisoUsuario(snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, 'eliminar el permiso'),
		});
	}

	// #endregion
	// #region Rol & Vistas Loading
	loadVistasFromRol(): void {
		const rol = this.selectedRol();
		if (!rol) return;

		// Limpiar usuario seleccionado cuando cambia el rol
		this.store.setSelectedUsuarioId(null);
		this.store.setUsuariosSugeridos([]);

		// Cargar usuarios del rol seleccionado para el autocomplete
		this.permisosService
			.listarUsuariosPorRol(rol)
			.pipe(
				withRetry({ tag: 'PermisosUsuariosFacade:loadVistasFromRol' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (resultado) => {
					this.store.setUsuariosSugeridos(resultado.usuarios);
				},
				error: (err) => {
					logger.error('Error al cargar usuarios por rol:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadVistasRol,
					);
				},
			});

		const permisoRol = this.permisosRol().find((p) => p.rol === rol);
		if (permisoRol) {
			this.store.setSelectedVistas([...permisoRol.vistas]);
			const modulos = this.helperService.buildModulosVistas(
				this.vistas(),
				permisoRol.vistas,
			);
			this.store.setModulosVistas(modulos);
		} else {
			this.store.setSelectedVistas([]);
			const modulos = this.helperService.buildModulosVistas(this.vistas(), []);
			this.store.setModulosVistas(modulos);
		}
	}

	searchUsuarios(termino: string): void {
		const rol = this.selectedRol();
		if (!rol) {
			this.store.setUsuariosSugeridos([]);
			return;
		}

		this.permisosService
			.buscarUsuarios(termino || undefined, rol)
			.pipe(
				withRetry({ tag: 'PermisosUsuariosFacade:searchUsuarios' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (resultado) => {
					this.store.setUsuariosSugeridos(resultado.usuarios);
				},
				error: (err) => {
					logger.error('Error al buscar usuarios:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.searchUsuarios,
					);
				},
			});
	}

	// #endregion
	// #region Vista Selection
	isVistaSelected(ruta: string): boolean {
		return this.selectedVistas().includes(ruta);
	}

	toggleVista(ruta: string): void {
		this.store.toggleVista(ruta);
		this.store.updateModuloCount();
	}

	toggleAllVistasModulo(): void {
		this.store.toggleAllVistasModulo();
		this.store.updateModuloCount();
	}

	// #endregion
	// #region UI Setters
	setSelectedRol(rol: RolTipoAdmin | null): void {
		this.store.setSelectedRol(rol);
	}

	setSelectedUsuarioId(id: number | null): void {
		this.store.setSelectedUsuarioId(id);
	}

	setActiveModuloIndex(index: number): void {
		this.store.setActiveModuloIndex(index);
	}

	setVistasBusqueda(term: string): void {
		this.store.setVistasBusqueda(term);
	}
	// #endregion
}
