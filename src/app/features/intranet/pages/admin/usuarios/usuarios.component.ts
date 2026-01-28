import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ROLES_USUARIOS_ADMIN, RolUsuarioAdmin, UsuarioLista } from '@core/services';

import { AdminUtilsService } from '@shared/services';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { FormFieldErrorComponent } from '@shared/components';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableLoadingDirective } from '@app/shared';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { UsuariosFacade } from './usuarios.facade';
import { UsuariosStatsSkeletonComponent } from './components/usuarios-stats-skeleton/usuarios-stats-skeleton.component';
import { UsuariosTableSkeletonComponent } from './components/usuarios-table-skeleton/usuarios-table-skeleton.component';

/**
 * Componente Page para administración de usuarios
 * Coordina la vista y delega la lógica al facade
 */
@Component({
	selector: 'app-usuarios',
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
		InputTextModule,
		SelectModule,
		DrawerModule,
		ToggleSwitch,
		PasswordModule,
		DatePickerModule,
		ConfirmDialogModule,
		FormFieldErrorComponent,
		TableLoadingDirective,
		UsuariosStatsSkeletonComponent,
		UsuariosTableSkeletonComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './usuarios.component.html',
	styleUrl: './usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit, AfterViewInit {
	private facade = inject(UsuariosFacade);
	private confirmationService = inject(ConfirmationService);
	readonly adminUtils = inject(AdminUtilsService);

	// ViewModel expuesto por el facade
	readonly vm = this.facade.vm;

	// Options para dropdowns (sin Apoderado para admin)
	readonly rolesDisponibles = ROLES_USUARIOS_ADMIN;
	readonly rolesOptions = [
		{ label: 'Todos los roles', value: null as RolUsuarioAdmin | null },
	].concat(ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r as RolUsuarioAdmin | null })));
	readonly rolesSelectOptions = ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r }));
	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	ngOnInit(): void {
		this.facade.loadData();
	}

	ngAfterViewInit(): void {
		this.fixConfirmDialogAria('Confirmación');
	}

	// ============ Data Loading ============

	refresh(): void {
		this.facade.refresh();
	}

	// ============ Filters ============

	onSearchChange(value: string): void {
		this.facade.setSearchTerm(value);
	}

	onFilterRolChange(value: RolUsuarioAdmin | null): void {
		this.facade.setFilterRol(value);
	}

	onFilterEstadoChange(value: boolean | null): void {
		this.facade.setFilterEstado(value);
	}

	clearFilters(): void {
		this.facade.clearFilters();
	}

	// ============ Detail Drawer ============

	openDetail(usuario: UsuarioLista): void {
		this.facade.openDetail(usuario);
	}

	closeDetail(): void {
		this.facade.closeDetail();
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}

	/**
	 * Handler para sincronizar estado del drawer
	 * Se dispara cuando se cierra por cualquier medio
	 */
	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}

	// ============ Edit Dialog ============

	openNew(): void {
		this.facade.openNew();
	}

	editUsuario(usuario: UsuarioLista): void {
		this.facade.editUsuario(usuario);
	}

	hideDialog(): void {
		this.facade.hideDialog();
	}

	saveUsuario(): void {
		this.facade.saveUsuario();
	}

	/**
	 * Handler para sincronizar estado del dialog
	 * Se dispara cuando el dialog se cierra por cualquier medio:
	 * - Clic en X
	 * - Clic fuera (backdrop)
	 * - ESC
	 * - Botón cancelar
	 */
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.hideDialog();
		}
	}

	// ============ Form Field Updates ============

	onFieldChange(field: string, value: unknown): void {
		this.facade.updateFormField(field, value);
	}

	// ============ CRUD Operations ============

	deleteUsuario(usuario: UsuarioLista): void {
		const header = 'Confirmar Eliminación';

		// ✅ Abrir estado ANTES de mostrar el diálogo
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: `¿Está seguro de eliminar al usuario "${usuario.nombreCompleto}"?`,
			header,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Sí, eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.deleteUsuario(usuario);
				// No cerrar aquí, se cierra en onConfirmDialogHide
			},
			reject: () => {
				// No cerrar aquí, se cierra en onConfirmDialogHide
			},
		});

		// Fix aria después de que el diálogo se haya renderizado
		this.fixConfirmDialogAria(header);
	}

	toggleEstado(usuario: UsuarioLista): void {
		const header = usuario.estado ? 'Desactivar Usuario' : 'Activar Usuario';

		// ✅ Abrir estado ANTES de mostrar el diálogo
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: `¿Está seguro de ${usuario.estado ? 'desactivar' : 'activar'} al usuario "${usuario.nombreCompleto}"?`,
			header,
			icon: 'pi pi-question-circle',
			acceptLabel: 'Sí',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: usuario.estado ? 'p-button-warning' : 'p-button-success',
			accept: () => {
				this.facade.toggleEstado(usuario);
				// No cerrar aquí, se cierra en onConfirmDialogHide
			},
			reject: () => {
				// No cerrar aquí, se cierra en onConfirmDialogHide
			},
		});

		// Fix aria después de que el diálogo se haya renderizado
		this.fixConfirmDialogAria(header);
	}

	private fixConfirmDialogAria(header: string) {
		setTimeout(() => {
			const dialog = document.querySelector('p-dialog[role="alertdialog"]');

			if (dialog) {
				dialog.setAttribute('aria-label', header);
			}
		});
	}

	/**
	 * Handler para sincronizar estado del confirm dialog
	 * Se dispara cuando se cierra por cualquier medio
	 */
	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
}
