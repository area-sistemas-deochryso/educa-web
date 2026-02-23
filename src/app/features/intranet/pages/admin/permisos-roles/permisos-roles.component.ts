import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { AdminUtilsService } from '@shared/services';
import { buildDeletePermisoRolMessage } from '@app/shared/constants';

import { PermisosRolesFacade } from './services/permisos-roles.facade';
import type { PermisoRol, RolTipoAdmin } from '@core/services';

@Component({
	selector: 'app-permisos-roles',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		InputTextModule,
		CheckboxModule,
		DrawerModule,
		SelectModule,
		ConfirmDialogModule,
	],
	providers: [ConfirmationService],
	templateUrl: './permisos-roles.component.html',
	styleUrl: './permisos-roles.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosRolesComponent implements OnInit {
	// #region Dependencias
	private facade = inject(PermisosRolesFacade);
	private confirmationService = inject(ConfirmationService);
	readonly adminUtils = inject(AdminUtilsService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	readonly rolesDisponibles = this.facade.rolesDisponibles;
	// #endregion

	// #region Estado local
	/** Guard para ignorar el onLazyLoad inicial (ngOnInit ya carga los datos) */
	private initialLoadDone = signal(false);
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers
	onLazyLoad(event: { first?: number; rows?: number }): void {
		// Ignorar el primer onLazyLoad automático: ngOnInit ya cargó los datos
		if (!this.initialLoadDone()) {
			this.initialLoadDone.set(true);
			return;
		}

		const rows = event.rows ?? 10;
		const page = Math.floor((event.first ?? 0) / rows) + 1;
		this.facade.loadPage(page, rows);
	}

	refresh(): void {
		this.facade.loadAll();
	}

	openNew(): void {
		this.facade.openNewDialog();
	}

	editPermiso(permiso: PermisoRol): void {
		this.facade.openEditDialog(permiso);
	}

	savePermiso(): void {
		this.facade.savePermiso();
	}

	deletePermiso(permiso: PermisoRol): void {
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: buildDeletePermisoRolMessage(permiso.rol),
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.facade.delete(permiso),
		});
	}

	openDetail(permiso: PermisoRol): void {
		this.facade.openDetail(permiso);
	}

	closeDetail(): void {
		this.facade.closeDetail();
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}

	toggleVista(ruta: string): void {
		this.facade.toggleVista(ruta);
	}

	toggleAllVistasModulo(): void {
		this.facade.toggleAllVistasModulo();
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

	// #region Dialog sync handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion
}
