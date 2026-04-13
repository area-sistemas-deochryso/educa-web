import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import {
	PermisoUsuario,
	ROLES_DISPONIBLES_ADMIN,
	RolTipoAdmin,
} from '@core/services';
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	buildDeletePermisosUsuarioMessage,
} from '@app/shared/constants';
import { PageHeaderComponent } from '@shared/components';
import { withAllOption } from '@shared/models';
import { PermissionsUsersDataFacade, PermissionsUsersCrudFacade, PermissionsUsersUiFacade } from './services';
import { PermissionsStatsCardsComponent } from './components/permisos-stats-cards/permisos-stats-cards.component';
import { PermissionsDetailDrawerComponent } from './components/permisos-detail-drawer/permisos-detail-drawer.component';
import { PermissionsEditDialogComponent } from './components/permisos-edit-dialog/permisos-edit-dialog.component';

@Component({
	selector: 'app-permissions-users',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		TooltipModule,
		TagModule,
		ProgressSpinnerModule,
		SelectModule,
		InputTextModule,
		ConfirmDialogModule,
		PageHeaderComponent,
		PermissionsStatsCardsComponent,
		PermissionsDetailDrawerComponent,
		PermissionsEditDialogComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './permisos-usuarios.component.html',
	styleUrl: './permisos-usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsUsersComponent implements OnInit {
	private data = inject(PermissionsUsersDataFacade);
	private crud = inject(PermissionsUsersCrudFacade);
	private ui = inject(PermissionsUsersUiFacade);
	private confirmationService = inject(ConfirmationService);

	// #region Facade state (signals)
	readonly vm = this.data.vm;
	readonly permisosUsuario = this.data.permisosUsuario;
	readonly vistas = this.data.vistas;
	readonly loading = this.data.loading;
	readonly dialogVisible = this.ui.dialogVisible;
	readonly detailDrawerVisible = this.ui.detailDrawerVisible;
	readonly selectedPermiso = this.data.selectedPermiso;
	readonly searchTerm = this.data.searchTerm;
	readonly filterRol = this.data.filterRol;
	readonly uiMapping = this.data.uiMapping;
	// #endregion

	// #region Computed from facade
	readonly totalUsuarios = this.data.totalUsuarios;
	readonly totalModulos = this.data.totalModulos;
	readonly filteredPermisos = this.data.filteredPermisos;
	readonly moduloVistasForDetail = this.data.moduloVistasForDetail;
	// #endregion

	// #region Options
	rolesDisponibles = ROLES_DISPONIBLES_ADMIN;
	rolesOptions = withAllOption(
		ROLES_DISPONIBLES_ADMIN.map((r) => ({ label: r, value: r })),
		'Todos los roles',
	);
	// #endregion

	ngOnInit(): void {
		this.data.loadData();
	}

	// #region Actions
	refresh(): void {
		this.data.refresh();
	}

	clearFilters(): void {
		this.data.clearFilters();
	}
	// #endregion

	// #region Detail Drawer
	openDetail(permiso: PermisoUsuario): void {
		this.ui.openDetail(permiso);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.ui.closeDetail();
		}
	}

	editFromDetail(): void {
		this.ui.editFromDetail();
	}
	// #endregion

	// #region Edit Dialog
	openNew(): void {
		this.ui.openNew();
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.ui.editPermiso(permiso);
	}

	hideDialog(): void {
		this.ui.hideDialog();
	}

	savePermiso(): void {
		this.crud.savePermiso(() => this.ui.hideDialog());
	}

	deletePermiso(permiso: PermisoUsuario): void {
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
				if (this.vm().loading) return;
				this.crud.deletePermiso(permiso.id);
			},
		});
	}
	// #endregion

	// #region UI Helpers (bindings bidireccionales)
	onSearchTermChange(term: string): void {
		this.data.setSearchTerm(term);
	}

	onFilterRolChange(rol: RolTipoAdmin | null): void {
		this.data.setFilterRol(rol);
	}
	// #endregion
}
