// #region Imports
import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
	UsuariosCrudFacade,
	UsuariosDataFacade,
	UsuariosUiFacade,
	ROLES_USUARIOS_ADMIN,
	RolUsuarioAdmin,
	UsuarioLista,
} from './services';
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
import { UsuariosImportDialogComponent } from './components/usuarios-import-dialog/usuarios-import-dialog.component';
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	buildToggleUsuarioMessage,
} from '@app/shared/constants';
import type { ImportarEstudianteItem } from './services';

// #endregion
// #region Implementation
@Component({
	selector: 'app-usuarios',
	standalone: true,
	imports: [
		ButtonModule,
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
		UsuariosImportDialogComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './usuarios.component.html',
	styleUrl: './usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements AfterViewInit {
	private dataFacade = inject(UsuariosDataFacade);
	private crudFacade = inject(UsuariosCrudFacade);
	private uiFacade = inject(UsuariosUiFacade);
	private confirmationService = inject(ConfirmationService);

	// * View-model snapshot from data facade (signals).
	readonly vm = this.dataFacade.vm;

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

	constructor() {
		// Disparar carga en constructor para que los skeletons se muestren
		// desde el primer frame sin esperar a ngOnInit
		this.dataFacade.loadData();
	}

	ngAfterViewInit(): void {
		// * Fix aria label after confirm dialog renders.
		this.fixConfirmDialogAria('Confirmación');
	}

	// #region Data & Filter handlers
	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onSearchChange(value: string): void {
		this.dataFacade.setSearchTerm(value);
	}

	onFilterRolChange(value: RolUsuarioAdmin | null): void {
		this.dataFacade.setFilterRol(value);
	}

	onFilterEstadoChange(value: boolean | null): void {
		this.dataFacade.setFilterEstado(value);
	}

	onClearFilters(): void {
		this.dataFacade.clearFilters();
	}

	onLazyLoad(event: { page: number; pageSize: number }): void {
		this.dataFacade.loadPage(event.page, event.pageSize);
	}
	// #endregion

	// #region UI handlers
	onNewUsuario(): void {
		this.uiFacade.openNew();
	}

	onViewDetail(usuario: UsuarioLista): void {
		this.uiFacade.openDetail(usuario);
	}

	onEditUsuario(usuario: UsuarioLista): void {
		this.uiFacade.editUsuario(usuario);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeDetail();
		}
	}

	onCloseDetail(): void {
		this.uiFacade.closeDetail();
	}

	onEditFromDetail(): void {
		this.uiFacade.editFromDetail();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.hideDialog();
		}
	}

	onFormFieldChange(event: { field: string; value: unknown }): void {
		this.uiFacade.updateFormField(event.field, event.value);
	}

	onCancelDialog(): void {
		this.uiFacade.hideDialog();
	}

	onImportUsuarios(): void {
		this.uiFacade.openImportDialog();
	}

	onImportDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeImportDialog();
		}
	}

	onConfirmDialogHide(): void {
		this.uiFacade.closeConfirmDialog();
	}
	// #endregion

	// #region CRUD handlers
	onToggleEstado(usuario: UsuarioLista): void {
		// ! Confirmation dialog before enabling/disabling a user.
		const header = usuario.estado
			? UI_CONFIRM_HEADERS.deactivateUser
			: UI_CONFIRM_HEADERS.activateUser;
		this.uiFacade.openConfirmDialog();

		this.confirmationService.confirm({
			message: buildToggleUsuarioMessage(usuario.nombreCompleto, usuario.estado),
			header,
			icon: 'pi pi-question-circle',
			acceptLabel: UI_CONFIRM_LABELS.yes,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			acceptButtonStyleClass: usuario.estado ? 'p-button-warning' : 'p-button-success',
			accept: () => {
				this.crudFacade.toggleEstado(usuario);
			},
			reject: () => {},
		});

		this.fixConfirmDialogAria(header);
	}

	onSaveUsuario(): void {
		this.crudFacade.saveUsuario();
	}

	onImportar(filas: ImportarEstudianteItem[]): void {
		this.crudFacade.importarEstudiantes(filas);
	}
	// #endregion

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
