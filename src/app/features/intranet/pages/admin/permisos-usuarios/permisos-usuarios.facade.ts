import { Injectable, DestroyRef, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger } from '@core/helpers';
import {
	PermisosService,
	PermisoUsuario,
	RolTipoAdmin,
	UsuarioBusqueda,
	ErrorHandlerService,
} from '@core/services';
import { AdminUtilsService } from '@shared/services';
import { PermisosUsuariosStore } from './permisos-usuarios.store';
import { PermisosUsuariosHelperService } from './permisos-usuarios-helper.service';

@Injectable({ providedIn: 'root' })
export class PermisosUsuariosFacade {
	private store = inject(PermisosUsuariosStore);
	private permisosService = inject(PermisosService);
	private helperService = inject(PermisosUsuariosHelperService);
	private errorHandler = inject(ErrorHandlerService);
	readonly adminUtils = inject(AdminUtilsService);
	private destroyRef = inject(DestroyRef);

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
	readonly vistasFiltradas = this.store.vistasFiltradas;
	readonly isAllModuloSelected = this.store.isAllModuloSelected;

	// Computed - Statistics
	readonly totalUsuarios = computed(() => this.permisosUsuario().length);

	readonly totalModulos = computed(() => {
		const modulos = new Set<string>();
		this.vistas().forEach((v) => {
			const modulo = this.adminUtils.getModuloFromRuta(v.ruta);
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

	// === Data Loading ===
	loadData(): void {
		this.store.setLoading(true);

		forkJoin({
			vistas: this.permisosService.getVistas(),
			permisosRol: this.permisosService.getPermisosRol(),
			permisosUsuario: this.permisosService.getPermisosUsuario(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
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
					this.errorHandler.showError('Error', 'No se pudieron cargar los permisos');
					this.store.setLoading(false);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}

	// === Filters ===
	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
	}

	setFilterRol(rol: RolTipoAdmin | null): void {
		this.store.setFilterRol(rol);
	}

	clearFilters(): void {
		this.store.clearFilters();
	}

	// === Detail Drawer ===
	openDetail(permiso: PermisoUsuario): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setDetailDrawerVisible(true);
	}

	closeDetail(): void {
		this.store.setDetailDrawerVisible(false);
	}

	// === Edit Dialog ===
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
		this.store.setLoading(true);

		const operation$ = this.isEditing()
			? (() => {
					const permiso = this.selectedPermiso();
					if (!permiso) return null;
					return this.permisosService.actualizarPermisoUsuario(permiso.id, { vistas });
				})()
			: (() => {
					const usuarioId = this.selectedUsuarioId();
					const rol = this.selectedRol();
					if (!usuarioId || !rol) return null;
					return this.permisosService.crearPermisoUsuario({ usuarioId, rol, vistas });
				})();

		if (!operation$) {
			this.store.setLoading(false);
			return;
		}

		operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.hideDialog();
				this.loadData();
			},
			error: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError('Error', 'No se pudo guardar el permiso');
				this.store.setLoading(false);
			},
		});
	}

	deletePermiso(id: number): void {
		this.store.setLoading(true);
		this.permisosService
			.eliminarPermisoUsuario(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadData(),
				error: (err) => {
					logger.error('Error al eliminar:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el permiso');
					this.store.setLoading(false);
				},
			});
	}

	// === Rol & Vistas Loading ===
	loadVistasFromRol(): void {
		const rol = this.selectedRol();
		if (!rol) return;

		// Limpiar usuario seleccionado cuando cambia el rol
		this.store.setSelectedUsuarioId(null);

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

	// === Vista Selection ===
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

	// === UI Setters ===
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
}
