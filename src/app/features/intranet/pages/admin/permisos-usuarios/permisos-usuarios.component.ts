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
import { PermisosUsuariosFacade } from './services/permisos-usuarios.facade';
import { PermisosStatsCardsComponent } from './components/permisos-stats-cards/permisos-stats-cards.component';
import { PermisosDetailDrawerComponent } from './components/permisos-detail-drawer/permisos-detail-drawer.component';
import { PermisosEditDialogComponent } from './components/permisos-edit-dialog/permisos-edit-dialog.component';

@Component({
	selector: 'app-permisos-usuarios',
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
		PermisosStatsCardsComponent,
		PermisosDetailDrawerComponent,
		PermisosEditDialogComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './permisos-usuarios.component.html',
	styleUrl: './permisos-usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosUsuariosComponent implements OnInit {
	private facade = inject(PermisosUsuariosFacade);
	private confirmationService = inject(ConfirmationService);

	// #region Facade state (signals)
	readonly permisosUsuario = this.facade.permisosUsuario;
	readonly vistas = this.facade.vistas;
	readonly loading = this.facade.loading;
	readonly dialogVisible = this.facade.dialogVisible;
	readonly detailDrawerVisible = this.facade.detailDrawerVisible;
	readonly selectedPermiso = this.facade.selectedPermiso;
	readonly searchTerm = this.facade.searchTerm;
	readonly filterRol = this.facade.filterRol;
	readonly uiMapping = this.facade.uiMapping;
	// #endregion

	// #region Computed from facade
	readonly totalUsuarios = this.facade.totalUsuarios;
	readonly totalModulos = this.facade.totalModulos;
	readonly filteredPermisos = this.facade.filteredPermisos;
	readonly moduloVistasForDetail = this.facade.moduloVistasForDetail;
	// #endregion

	// #region Options
	rolesDisponibles = ROLES_DISPONIBLES_ADMIN;
	rolesOptions = withAllOption(
		ROLES_DISPONIBLES_ADMIN.map((r) => ({ label: r, value: r })),
		'Todos los roles',
	);
	// #endregion

	ngOnInit(): void {
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

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}
	// #endregion

	// #region Edit Dialog
	openNew(): void {
		this.facade.openNew();
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.facade.editPermiso(permiso);
	}

	hideDialog(): void {
		this.facade.hideDialog();
	}

	savePermiso(): void {
		this.facade.savePermiso();
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
				this.facade.deletePermiso(permiso.id);
			},
		});
	}
	// #endregion

	// #region UI Helpers (bindings bidireccionales)
	onSearchTermChange(term: string): void {
		this.facade.setSearchTerm(term);
	}

	onFilterRolChange(rol: RolTipoAdmin | null): void {
		this.facade.setFilterRol(rol);
	}
	// #endregion
}
