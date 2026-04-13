import { Injectable, DestroyRef, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, facadeErrorHandler } from '@core/helpers';
import {
	PermissionsService,
	RolTipoAdmin,
	ErrorHandlerService,
	SwService,
} from '@core/services';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { UiMappingService } from '@shared/services';
import { PermissionsUsersStore } from './permisos-usuarios.store';
import { PermissionsUsersHelperService } from './permisos-usuarios-helper.service';

@Injectable({ providedIn: 'root' })
export class PermissionsUsersDataFacade {
	private store = inject(PermissionsUsersStore);
	private permisosService = inject(PermissionsService);
	private helperService = inject(PermissionsUsersHelperService);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);
	readonly uiMapping = inject(UiMappingService);
	private readonly errHandler = facadeErrorHandler({
		tag: 'PermisosUsuariosDataFacade',
		errorHandler: this.errorHandler,
	});

	// #region Estado expuesto
	readonly vm = this.store.vm;
	readonly permisosUsuario = this.store.permisosUsuario;
	readonly permisosRol = this.store.permisosRol;
	readonly vistas = this.store.vistas;
	readonly loading = this.store.loading;
	readonly searchTerm = this.store.searchTerm;
	readonly filterRol = this.store.filterRol;
	readonly filteredPermisos = this.store.filteredPermisos;
	readonly selectedPermiso = this.store.selectedPermiso;
	readonly selectedRol = this.store.selectedRol;
	readonly selectedVistas = this.store.selectedVistas;
	readonly usuariosSugeridos = this.store.usuariosSugeridos;
	// #endregion

	// #region Computed
	readonly totalUsuarios = computed(() => this.permisosUsuario().length);

	readonly totalModulos = computed(() => {
		const modulos = new Set<string>();
		this.vistas().forEach((v) => {
			const modulo = this.uiMapping.getModuloFromRuta(v.ruta);
			modulos.add(modulo);
		});
		return modulos.size;
	});

	readonly moduloVistasForDetail = computed(() => {
		const permiso = this.selectedPermiso();
		if (!permiso) return [];
		return this.helperService.buildModulosVistasForDetail(this.vistas(), permiso.vistas);
	});

	readonly vistasCountLabel = computed(() =>
		this.helperService.getVistasCountLabel(this.selectedVistas().length),
	);
	// #endregion

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
				withRetry({ tag: 'PermisosUsuariosDataFacade:loadData' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ vistas, permisosRol, permisosUsuario }) => {
					this.store.setVistas(vistas.filter((v) => v.estado === 1));
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

	// #region Rol & Vistas Loading
	loadVistasFromRol(): void {
		const rol = this.selectedRol();
		if (!rol) return;

		this.store.setSelectedUsuarioId(null);
		this.store.setUsuariosSugeridos([]);

		this.permisosService
			.listarUsuariosPorRol(rol)
			.pipe(
				withRetry({ tag: 'PermisosUsuariosDataFacade:loadVistasFromRol' }),
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
				withRetry({ tag: 'PermisosUsuariosDataFacade:searchUsuarios' }),
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
}
