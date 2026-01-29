import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ROLES_USUARIOS_ADMIN, RolUsuarioAdmin, UsuarioLista } from '@core/services';
import { UsuariosFacade } from './usuarios.facade';
import { UsuariosHeaderComponent } from './components/usuarios-header/usuarios-header.component';
import { UsuariosStatsComponent } from './components/usuarios-stats/usuarios-stats.component';
import { UsuariosStatsSkeletonComponent } from './components/usuarios-stats-skeleton/usuarios-stats-skeleton.component';
import {
	FilterOptions,
	UsuariosFiltersComponent,
} from './components/usuarios-filters/usuarios-filters.component';
import { UsuariosTableComponent } from './components/usuarios-table/usuarios-table.component';
import { UsuariosTableSkeletonComponent } from './components/usuarios-table-skeleton/usuarios-table-skeleton.component';
import { UsuarioDetailDrawerComponent } from './components/usuario-detail-drawer/usuario-detail-drawer.component';
import {
	FormValidationErrors,
	UsuarioFormData,
	UsuarioFormDialogComponent,
} from './components/usuario-form-dialog/usuario-form-dialog.component';

@Component({
	selector: 'app-usuarios',
	standalone: true,
	imports: [
		CommonModule,
		ConfirmDialogModule,
		UsuariosHeaderComponent,
		UsuariosStatsComponent,
		UsuariosStatsSkeletonComponent,
		UsuariosFiltersComponent,
		UsuariosTableComponent,
		UsuariosTableSkeletonComponent,
		UsuarioDetailDrawerComponent,
		UsuarioFormDialogComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './usuarios.component.html',
	styleUrl: './usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit, AfterViewInit {
	private facade = inject(UsuariosFacade);
	private confirmationService = inject(ConfirmationService);

	readonly vm = this.facade.vm;

	readonly filterOptions: FilterOptions = {
		rolesOptions: [{ label: 'Todos los roles', value: null as RolUsuarioAdmin | null }].concat(
			ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r as RolUsuarioAdmin | null })),
		),
		estadoOptions: [
			{ label: 'Todos', value: null },
			{ label: 'Activos', value: true },
			{ label: 'Inactivos', value: false },
		],
	};

	get formData(): UsuarioFormData {
		return this.vm().formData as UsuarioFormData;
	}

	get formErrors(): FormValidationErrors {
		return {
			dniError: this.vm().dniError,
			correoError: this.vm().correoError,
			correoApoderadoError: this.vm().correoApoderadoError,
		};
	}

	ngOnInit(): void {
		this.facade.loadData();
	}

	ngAfterViewInit(): void {
		this.fixConfirmDialogAria('Confirmación');
	}

	onRefresh(): void {
		this.facade.refresh();
	}

	onSearchChange(value: string): void {
		this.facade.setSearchTerm(value);
	}

	onFilterRolChange(value: RolUsuarioAdmin | null): void {
		this.facade.setFilterRol(value);
	}

	onFilterEstadoChange(value: boolean | null): void {
		this.facade.setFilterEstado(value);
	}

	onClearFilters(): void {
		this.facade.clearFilters();
	}

	onNewUsuario(): void {
		this.facade.openNew();
	}

	onViewDetail(usuario: UsuarioLista): void {
		this.facade.openDetail(usuario);
	}

	onEditUsuario(usuario: UsuarioLista): void {
		this.facade.editUsuario(usuario);
	}

	onToggleEstado(usuario: UsuarioLista): void {
		const header = usuario.estado ? 'Desactivar Usuario' : 'Activar Usuario';
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
			},
			reject: () => {},
		});

		this.fixConfirmDialogAria(header);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}

	onCloseDetail(): void {
		this.facade.closeDetail();
	}

	onEditFromDetail(): void {
		this.facade.editFromDetail();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.hideDialog();
		}
	}

	onFormFieldChange(event: { field: string; value: unknown }): void {
		this.facade.updateFormField(event.field, event.value);
	}

	onSaveUsuario(): void {
		this.facade.saveUsuario();
	}

	onCancelDialog(): void {
		this.facade.hideDialog();
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}

	private fixConfirmDialogAria(header: string): void {
		setTimeout(() => {
			const dialog = document.querySelector('p-dialog[role="alertdialog"]');
			if (dialog) {
				dialog.setAttribute('aria-label', header);
			}
		});
	}
}
