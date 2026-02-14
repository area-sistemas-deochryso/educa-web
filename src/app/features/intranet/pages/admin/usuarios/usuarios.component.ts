// #region Imports
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
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	buildToggleUsuarioMessage,
} from '@app/shared/constants';

// #endregion
// #region Implementation
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

	// * View-model snapshot from facade (signals).
	readonly vm = this.facade.vm;

	// * Static filter options for roles/estado.
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
		// * Form dialog reads from vm in a single place.
		return this.vm().formData as UsuarioFormData;
	}

	get formErrors(): FormValidationErrors {
		// * Map validation errors for the form dialog.
		return {
			dniError: this.vm().dniError,
			correoError: this.vm().correoError,
			correoApoderadoError: this.vm().correoApoderadoError,
			nombreApoderadoError: this.vm().nombreApoderadoError,
			telefonoApoderadoError: this.vm().telefonoApoderadoError,
		};
	}

	ngOnInit(): void {
		// * Initial data fetch for list + stats + filters.
		this.facade.loadData();
	}

	ngAfterViewInit(): void {
		// * Fix aria label after confirm dialog renders.
		this.fixConfirmDialogAria('ConfirmaciÃƒÆ’Ã‚Â³n');
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
		// ! Confirmation dialog before enabling/disabling a user.
		const header = usuario.estado
			? UI_CONFIRM_HEADERS.deactivateUser
			: UI_CONFIRM_HEADERS.activateUser;
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: buildToggleUsuarioMessage(usuario.nombreCompleto, usuario.estado),
			header,
			icon: 'pi pi-question-circle',
			acceptLabel: UI_CONFIRM_LABELS.yes,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
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
		// * PrimeNG dialog renders async; patch aria-label for a11y.
		setTimeout(() => {
			const dialog = document.querySelector('p-dialog[role="alertdialog"]');
			if (dialog) {
				dialog.setAttribute('aria-label', header);
			}
		});
	}
}
// #endregion
