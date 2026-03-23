// #region Imports
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { UsuariosService } from './services/usuarios.service';
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
import { environment } from '@env/environment';
import { logger } from '@core/helpers';
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
	private usuariosApi = inject(UsuariosService);

	// * Migration state (one-time, only in development)
	readonly isDev = !environment.production;
	readonly migracionLoading = signal(false);
	readonly migracionCompletada = signal(false);
	readonly migracionMensaje = signal('');

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

	onExportCredenciales(rol: string): void {
		this.usuariosApi.exportarCredenciales(rol).subscribe({
			next: async (credenciales) => {
				if (!credenciales || credenciales.length === 0) {
					logger.warn('No hay credenciales para exportar');
					return;
				}
				try {
					await this.generateExcel(credenciales, rol);
				} catch (err) {
					logger.error('Error al generar Excel', err);
				}
			},
			error: (err) => logger.error('Error al exportar credenciales', err),
		});
	}

	private async generateExcel(
		credenciales: { nombreCompleto: string; dni: string; contrasena: string | null }[],
		rol: string,
	): Promise<void> {
		const ExcelJS = await import('exceljs');
		const { saveAs } = await import('file-saver');

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mod = ExcelJS as any;
		const WorkbookClass = mod.Workbook ?? mod.default?.Workbook;
		const workbook = new WorkbookClass();
		const rolLabel = rol === 'Estudiante' ? 'Alumnos' : 'Profesores';
		const sheet = workbook.addWorksheet(`Credenciales ${rolLabel}`);

		sheet.columns = [
			{ header: 'Nombre Completo', key: 'nombreCompleto', width: 40 },
			{ header: 'DNI', key: 'dni', width: 15 },
			{ header: 'Contraseña', key: 'contrasena', width: 20 },
		];

		// Header styling
		const headerRow = sheet.getRow(1);
		headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
		headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
		headerRow.height = 25;

		credenciales.forEach((c) => {
			sheet.addRow({
				nombreCompleto: c.nombreCompleto,
				dni: c.dni,
				contrasena: c.contrasena ?? '(no disponible)',
			});
		});

		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});
		const fecha = new Date().toISOString().slice(0, 10);
		saveAs(blob, `Credenciales_${rolLabel}_${fecha}.xlsx`);
	}

	onMigrarContrasenas(): void {
		this.migracionLoading.set(true);
		this.usuariosApi.migrarContrasenas().subscribe({
			next: (res) => {
				const d = res.data;
				this.migracionMensaje.set(
					`Migración completada: ${d.migrados} migrados, ${d.yaHasheados} ya hasheados, ${d.yaMigrados} ya migrados.`,
				);
				this.migracionCompletada.set(true);
				this.migracionLoading.set(false);
			},
			error: () => {
				this.migracionLoading.set(false);
			},
		});
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
