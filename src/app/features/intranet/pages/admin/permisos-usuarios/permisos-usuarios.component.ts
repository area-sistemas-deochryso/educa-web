import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DrawerModule } from 'primeng/drawer';
import {
	AutoCompleteModule,
	AutoCompleteCompleteEvent,
	AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import {
	PermisosService,
	PermisoUsuario,
	ROLES_DISPONIBLES_ADMIN,
	RolTipoAdmin,
	UsuarioBusqueda,
} from '@core/services';
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	buildDeletePermisosUsuarioMessage,
} from '@app/shared/constants';
import { PermisosUsuariosFacade } from './permisos-usuarios.facade';

@Component({
	selector: 'app-permisos-usuarios',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		ProgressSpinnerModule,
		SelectModule,
		InputTextModule,
		CheckboxModule,
		DrawerModule,
		AutoCompleteModule,
		ConfirmDialogModule,
	],
	providers: [ConfirmationService],
	templateUrl: './permisos-usuarios.component.html',
	styleUrl: './permisos-usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosUsuariosComponent implements OnInit {
	private facade = inject(PermisosUsuariosFacade);
	private permisosService = inject(PermisosService);
	private confirmationService = inject(ConfirmationService);
	private destroyRef = inject(DestroyRef);

	// * Facade state (signals)
	readonly permisosUsuario = this.facade.permisosUsuario;
	readonly vistas = this.facade.vistas;
	readonly loading = this.facade.loading;
	readonly dialogVisible = this.facade.dialogVisible;
	readonly detailDrawerVisible = this.facade.detailDrawerVisible;
	readonly isEditing = this.facade.isEditing;
	readonly selectedPermiso = this.facade.selectedPermiso;
	readonly selectedUsuarioId = this.facade.selectedUsuarioId;
	readonly selectedRol = this.facade.selectedRol;
	readonly selectedVistas = this.facade.selectedVistas;
	readonly searchTerm = this.facade.searchTerm;
	readonly filterRol = this.facade.filterRol;
	readonly modulosVistas = this.facade.modulosVistas;
	readonly activeModuloIndex = this.facade.activeModuloIndex;
	readonly vistasBusqueda = this.facade.vistasBusqueda;
	readonly adminUtils = this.facade.adminUtils;

	// * Computed from facade
	readonly totalUsuarios = this.facade.totalUsuarios;
	readonly totalModulos = this.facade.totalModulos;
	readonly filteredPermisos = this.facade.filteredPermisos;
	readonly vistasFiltradas = this.facade.vistasFiltradas;
	readonly vistasCountLabel = this.facade.vistasCountLabel;
	readonly moduloVistasForDetail = this.facade.moduloVistasForDetail;
	readonly isAllModuloSelected = this.facade.isAllModuloSelected;

	// * Autocomplete local state (ephemeral)
	selectedUsuario: UsuarioBusqueda | null = null;
	usuariosSugeridos: UsuarioBusqueda[] = [];

	// Options (sin Apoderado para admin)
	rolesDisponibles = ROLES_DISPONIBLES_ADMIN;
	rolesOptions = [{ label: 'Todos los roles', value: null as RolTipoAdmin | null }].concat(
		ROLES_DISPONIBLES_ADMIN.map((r) => ({ label: r, value: r as RolTipoAdmin | null })),
	);
	rolesSelectOptions = ROLES_DISPONIBLES_ADMIN.map((r) => ({ label: r, value: r }));

	ngOnInit(): void {
		// * Initial load
		this.facade.loadData();
	}

	// #region Actions
	refresh(): void {
		this.facade.refresh();
	}

	clearFilters(): void {
		this.facade.clearFilters();
	}

	// #endregion
	// #region Detail Drawer
	openDetail(permiso: PermisoUsuario): void {
		this.facade.openDetail(permiso);
	}

	/**
	 * Handler para sincronizar estado del drawer
	 * Se dispara cuando se cierra por cualquier medio: X, ESC, backdrop
	 */
	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}

	closeDetail(): void {
		this.facade.closeDetail();
	}

	// #endregion
	// #region Edit Dialog
	openNew(): void {
		this.selectedUsuario = null;
		this.usuariosSugeridos = [];
		this.facade.openNew();
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.facade.editPermiso(permiso);
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}

	hideDialog(): void {
		this.facade.hideDialog();
	}

	savePermiso(): void {
		this.facade.savePermiso();
	}

	deletePermiso(permiso: PermisoUsuario): void {
		// ! Confirm delete with explicit user/role context.
		const nombre = permiso.nombreUsuario || `ID: ${permiso.usuarioId}`;
		const mensaje = buildDeletePermisosUsuarioMessage(nombre, permiso.rol);

		this.confirmationService.confirm({
			message: mensaje,
			header: UI_CONFIRM_HEADERS.delete,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: UI_CONFIRM_LABELS.yesDelete,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.deletePermiso(permiso.id);
			},
		});
	}

	// #endregion
	// #region Rol & Vistas
	loadVistasFromRol(): void {
		// * Reset selected user when role changes.
		// Limpiar usuario seleccionado cuando cambia el rol
		this.selectedUsuario = null;
		this.facade.setSelectedUsuarioId(null);

		// Cargar usuarios del rol seleccionado para el autocomplete
		const rol = this.selectedRol();
		if (rol) {
			this.permisosService
				.listarUsuariosPorRol(rol)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe((resultado) => {
					this.usuariosSugeridos = resultado.usuarios;
				});
		}

		this.facade.loadVistasFromRol();
	}

	// #endregion
	// #region Autocomplete Usuarios
	buscarUsuarios(event: AutoCompleteCompleteEvent): void {
		// * Autocomplete: role-specific search.
		const rol = this.selectedRol();
		if (!rol) {
			this.usuariosSugeridos = [];
			return;
		}

		const termino = event.query?.trim() || '';

		this.permisosService
			.buscarUsuarios(termino || undefined, rol)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((resultado) => {
				this.usuariosSugeridos = resultado.usuarios;
			});
	}

	onUsuarioSeleccionado(event: AutoCompleteSelectEvent): void {
		const usuario = event.value as UsuarioBusqueda;
		this.selectedUsuario = usuario;
		this.facade.setSelectedUsuarioId(usuario.id);
	}

	onUsuarioClear(): void {
		this.selectedUsuario = null;
		this.facade.setSelectedUsuarioId(null);
	}

	// #endregion
	// #region Vista Selection
	isVistaSelected(ruta: string): boolean {
		return this.facade.isVistaSelected(ruta);
	}

	toggleVista(ruta: string): void {
		this.facade.toggleVista(ruta);
	}

	toggleAllVistasModulo(): void {
		this.facade.toggleAllVistasModulo();
	}

	// #endregion
	// #region UI Helpers (bindings bidireccionales)
	onSearchTermChange(term: string): void {
		this.facade.setSearchTerm(term);
	}

	onFilterRolChange(rol: RolTipoAdmin | null): void {
		this.facade.setFilterRol(rol);
	}

	onSelectedRolChange(rol: RolTipoAdmin | null): void {
		this.facade.setSelectedRol(rol);
	}

	onActiveModuloIndexChange(index: number): void {
		this.facade.setActiveModuloIndex(index);
	}

	onVistasBusquedaChange(term: string): void {
		this.facade.setVistasBusqueda(term);
	}
	// #endregion
}
