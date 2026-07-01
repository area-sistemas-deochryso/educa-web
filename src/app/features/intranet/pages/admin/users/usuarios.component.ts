/* eslint-disable max-lines -- Razón: god-page admin/usuarios concentra CRUD + dev migration + validation dialog + excel export + autoOpen (Plan 43 A13). Extracciones aplicadas (helpers/, services/payload.builder, helpers/auto-open-from-query). Resto requiere refactor mayor fuera del scope del brief 147. */
// #region Imports
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
	UsersCrudFacade,
	UsersDataFacade,
	UsersUiFacade,
	UsuarioLista,
} from './services';
import { RoleTab } from './models';
import { UsersService } from './services/usuarios.service';
import { UsersHeaderComponent } from './components/usuarios-header/usuarios-header.component';
import { UsersStatsComponent } from './components/usuarios-stats/usuarios-stats.component';
import { UsersStatsSkeletonComponent } from './components/usuarios-stats-skeleton/usuarios-stats-skeleton.component';
import {
	FilterOptions,
	UsersFiltersComponent,
} from './components/usuarios-filters/usuarios-filters.component';
import { withAllOption } from '@shared/models';
import { UsersTableComponent } from './components/usuarios-table/usuarios-table.component';
import { UsersTableSkeletonComponent } from './components/usuarios-table-skeleton/usuarios-table-skeleton.component';
import {
	FormValidationErrors,
	UsuarioFormData,
	UserFormDialogComponent,
} from './components/usuario-form-dialog/usuario-form-dialog.component';
import { UsersImportDialogComponent } from './components/usuarios-import-dialog/usuarios-import-dialog.component';
import {
	UsuarioValidacionItem,
	UsersValidationDialogComponent,
} from './components/usuarios-validation-dialog/usuarios-validation-dialog.component';
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	buildDuplicateNameMessage,
	buildToggleUsuarioMessage,
} from '@app/shared/constants';
import { environment } from '@env/environment';
import { APP_USER_ROLES } from '@shared/constants';
import { logger } from '@core/helpers';
import { ErrorStateComponent } from '@shared/components/error-state';
import { ExcelService } from '@core/services';
import type { ImportarEstudianteItem } from './services';
import { validarUsuarios } from './usuarios-validation.helpers';
import {
	AutoOpenTarget,
	findAutoOpenMatch,
	readAutoOpenQueryParams,
} from './helpers/auto-open-from-query.helper';

// #endregion
// #region Implementation
@Component({
	selector: 'app-users',
	standalone: true,
	imports: [
		ButtonModule,
		CommonModule,
		ConfirmDialogModule,
		UsersHeaderComponent,
		UsersStatsComponent,
		UsersStatsSkeletonComponent,
		UsersFiltersComponent,
		UsersTableComponent,
		UsersTableSkeletonComponent,
		UserFormDialogComponent,
		UsersImportDialogComponent,
		UsersValidationDialogComponent,
		ErrorStateComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './usuarios.component.html',
	styleUrl: './usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements AfterViewInit {
	protected dataFacade = inject(UsersDataFacade);
	private crudFacade = inject(UsersCrudFacade);
	private uiFacade = inject(UsersUiFacade);
	private confirmationService = inject(ConfirmationService);
	private usuariosApi = inject(UsersService);
	private excelService = inject(ExcelService);
	private destroyRef = inject(DestroyRef);
	private route = inject(ActivatedRoute);
	private router = inject(Router);

	private autoOpenTarget = signal<AutoOpenTarget | null>(null);

	// * Migration state (one-time, only in development)
	readonly isDev = !environment.production;
	readonly migracionLoading = signal(false);
	readonly migracionCompletada = signal(false);
	readonly migracionMensaje = signal('');
	readonly migrationPhase = signal<'toast' | 'spotlight' | 'hidden'>('toast');

	// * Validation dialog state
	readonly validationDialogVisible = signal(false);
	readonly validationLoading = signal(false);
	readonly validationItems = signal<UsuarioValidacionItem[]>([]);
	readonly validationAllValid = signal(false);
	private validationUsuarios = signal<UsuarioLista[]>([]);

	readonly vm = this.dataFacade.vm;

	readonly filterOptions: FilterOptions = {
		estadoOptions: withAllOption([
			{ label: 'Activos', value: true },
			{ label: 'Inactivos', value: false },
		]),
	};

	get formData(): UsuarioFormData {
		return this.vm().formData as UsuarioFormData;
	}

	get formErrors(): FormValidationErrors {
		return {
			dniError: this.vm().dniError,
			correoError: this.vm().correoError,
			correoApoderadoError: this.vm().correoApoderadoError,
			nombreApoderadoError: this.vm().nombreApoderadoError,
			telefonoApoderadoError: this.vm().telefonoApoderadoError,
		};
	}

	constructor() {
		this.dataFacade.loadData();
		this.initAutoOpen();
		this.initTabFromQueryParams();
		this.initMigrationTimer();

		effect(() => {
			const pending = this.crudFacade.pendingDuplicate();
			if (!pending) return;

			const { nombres, apellidos, match } = pending;
			const fullName = `${nombres} ${apellidos}`;
			const header = UI_CONFIRM_HEADERS.duplicateName;

			this.uiFacade.openConfirmDialog();
			this.confirmationService.confirm({
				message: buildDuplicateNameMessage(fullName, match.dniPartial, match.grado, match.seccion),
				header,
				icon: 'pi pi-exclamation-triangle',
				acceptLabel: UI_CONFIRM_LABELS.yesContinue,
				rejectLabel: UI_CONFIRM_LABELS.cancel,
				acceptButtonStyleClass: 'p-button-warning',
				accept: () => this.crudFacade.confirmDuplicate(),
				reject: () => this.crudFacade.cancelDuplicate(),
			});
			this.fixConfirmDialogAria(header);
		});
	}

	ngAfterViewInit(): void {
		this.fixConfirmDialogAria('Confirmación');
	}

	// #region Tab + Data & Filter handlers
	onTabChange(tab: RoleTab): void {
		this.dataFacade.setActiveTab(tab);
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { tab: tab ?? undefined },
			queryParamsHandling: 'merge',
		});
	}

	onRefresh(): void { this.dataFacade.refresh(); }
	onSearchChange(value: string): void { this.dataFacade.setSearchTerm(value); }
	onFilterEstadoChange(value: boolean | null): void { this.dataFacade.setFilterEstado(value); }
	onFilterSalonIdChange(value: number | null): void { this.dataFacade.setFilterSalonId(value); }
	onClearFilters(): void { this.dataFacade.clearFilters(); }
	onLazyLoad(event: { page: number; pageSize: number }): void { this.dataFacade.loadPage(event.page, event.pageSize); }
	// #endregion

	// #region UI handlers
	onNewUsuario(): void {
		this.uiFacade.openNew();
		const tab = this.vm().activeTab;
		if (tab === 'estudiantes') {
			this.uiFacade.updateFormField('rol', APP_USER_ROLES.Estudiante);
		} else if (tab === 'profesores') {
			this.uiFacade.updateFormField('rol', APP_USER_ROLES.Profesor);
		}
	}

	onEditUsuario(usuario: UsuarioLista): void {
		this.uiFacade.editUsuario(usuario);
	}

	onCancelDialog(): void { this.uiFacade.hideDialog(); }
	onImportUsuarios(): void { this.uiFacade.openImportDialog(); }
	onConfirmDialogHide(): void { this.uiFacade.closeConfirmDialog(); }

	onDialogVisibleChange(visible: boolean): void { if (!visible) this.uiFacade.hideDialog(); }
	onImportDialogVisibleChange(visible: boolean): void { if (!visible) this.uiFacade.closeImportDialog(); }

	onFormFieldChange(event: { field: string; value: unknown }): void {
		this.uiFacade.updateFormField(event.field, event.value);
	}

	onAsignarCursos(cursoIds: number[]): void {
		const usuario = this.vm().selectedUsuario;
		if (usuario) {
			this.uiFacade.asignarCursos(usuario.id, cursoIds);
		}
	}

	onDesasignarCurso(profesorCursoId: number): void {
		this.uiFacade.desasignarCurso(profesorCursoId);
	}

	onCopyDni(dni: string): void {
		navigator.clipboard.writeText(dni).catch(() => {
			logger.warn('Failed to copy DNI to clipboard');
		});
	}
	// #endregion

	// #region CRUD handlers
	onToggleEstado(usuario: UsuarioLista): void {
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
				if (this.vm().loading) return;
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

	onExportCredenciales(rol: string, esVerano = false, anio?: number): void {
		this.usuariosApi
			.exportarCredenciales(rol, anio, esVerano)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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
		credenciales: { nombreCompleto: string; dni: string; contrasena: string | null; grado: string | null; seccion: string | null }[],
		rol: string,
	): Promise<void> {
		const rolLabel = rol === APP_USER_ROLES.Estudiante ? 'Alumnos' : 'Profesores';
		const fecha = new Date().toISOString().slice(0, 10);

		await this.excelService.exportToXlsx({
			sheetName: `Credenciales ${rolLabel}`,
			fileName: `Credenciales_${rolLabel}_${fecha}.xlsx`,
			columns: [
				{ header: 'Nombre Completo', key: 'nombreCompleto', width: 40 },
				{ header: 'DNI', key: 'dni', width: 15 },
				{ header: 'Contraseña', key: 'contrasena', width: 20 },
				{ header: 'Grado', key: 'grado', width: 20 },
				{ header: 'Sección', key: 'seccion', width: 12 },
			],
			data: credenciales.map((c) => ({
				nombreCompleto: c.nombreCompleto,
				dni: c.dni,
				contrasena: c.contrasena ?? '(no disponible)',
				grado: c.grado ?? '',
				seccion: c.seccion ?? '',
			})),
		});
	}

	onMigrarContrasenas(): void {
		this.migracionLoading.set(true);
		this.usuariosApi
			.migrarContrasenas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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

	// #region Validation handlers
	onValidarDatos(): void {
		this.validationDialogVisible.set(true);
		this.validationLoading.set(true);
		this.validationAllValid.set(false);
		this.validationItems.set([]);

		this.usuariosApi
			.listarUsuarios()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (usuarios) => {
					this.validationUsuarios.set(usuarios);
					const invalidos = validarUsuarios(usuarios);
					this.validationItems.set(invalidos);
					this.validationAllValid.set(invalidos.length === 0);
					this.validationLoading.set(false);
				},
				error: () => {
					this.validationLoading.set(false);
					logger.error('Error al cargar usuarios para validación');
				},
			});
	}

	onValidationDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.validationDialogVisible.set(false);
		}
	}

	onEditFromValidation(item: UsuarioValidacionItem): void {
		const usuario = this.validationUsuarios().find(
			(u) => u.dni === item.dni && u.rol === item.rol,
		);
		if (!usuario) return;
		this.uiFacade.editUsuario(usuario);
	}
	// #endregion

	dismissMigration(): void {
		this.migrationPhase.set('hidden');
	}

	// #region Private helpers
	private initMigrationTimer(): void {
		if (!this.isDev) return;
		setTimeout(() => {
			if (this.migrationPhase() === 'toast') {
				this.migrationPhase.set('spotlight');
			}
		}, 3500);
	}

	private initAutoOpen(): void {
		this.autoOpenTarget.set(
			readAutoOpenQueryParams(this.route, (term) => this.dataFacade.setSearchTerm(term)),
		);
		effect(() => {
			const target = this.autoOpenTarget();
			if (!target) return;
			const snapshot = this.vm();
			const items = snapshot.usuarios as UsuarioLista[] | undefined;
			const match = findAutoOpenMatch(target, items);
			if (match) {
				this.autoOpenTarget.set(null);
				this.uiFacade.editUsuario(match);
				return;
			}
			if (target.kind === 'dni' && snapshot.loading === false && items !== undefined) {
				this.autoOpenTarget.set(null);
			}
		});
	}

	private initTabFromQueryParams(): void {
		const tabParam = this.route.snapshot.queryParamMap.get('tab');
		if (tabParam && ['estudiantes', 'profesores', 'admin'].includes(tabParam)) {
			this.dataFacade.setActiveTab(tabParam as RoleTab);
		}
	}

	private fixConfirmDialogAria(header: string): void {
		setTimeout(() => {
			const dialog = document.querySelector('p-dialog[role="alertdialog"]');
			if (dialog) {
				dialog.setAttribute('aria-label', header);
			}
		});
	}
	// #endregion
}
// #endregion
