// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { logger } from '@core/helpers';
import { SkeletonColumnDef, TableSkeletonComponent, StatsSkeletonComponent } from '@shared/components';
import { AttendanceScopeBannerComponent } from '@intranet-shared/components/attendance-scope-banner';
import { AttendanceReportsComponent } from '../../cross-role/attendance-reports';
import { CrossChexSyncStatusService } from '@core/services/signalr';
import { CrossChexSyncBannerComponent } from './components/crosschex-sync-banner';

import {
	AttendancesDataFacade,
	AttendancesCrudFacade,
	AttendancesCierresFacade,
	AttendancesUiFacade,
	AttendancesAdminStore,
	AsistenciaAdminLista,
	TipoOperacionAsistencia,
	TipoPersonaAsistencia,
	TipoPersonaFilter,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
	isValidDateIso,
	parseIsoDate,
	estadoSeverity,
	origenLabel,
	origenSeverity,
	tipoPersonaLabel,
	formatFechaIso,
} from './services';
// #endregion

@Component({
	selector: 'app-attendances-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DatePickerModule,
		ConfirmDialogModule,
		DialogModule,
		IconFieldModule,
		InputIconModule,
		InputTextModule,
		SelectModule,
		SelectButtonModule,
		TableModule,
		TagModule,
		ToastModule,
		TooltipModule,
		CheckboxModule,
		TableSkeletonComponent,
		StatsSkeletonComponent,
		Tabs,
		TabList,
		Tab,
		TabPanel,
		AttendanceScopeBannerComponent,
		AttendanceReportsComponent,
		CrossChexSyncBannerComponent,
	],
	providers: [ConfirmationService, MessageService],
	templateUrl: './attendances.component.html',
	styleUrl: './attendances.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancesComponent implements OnInit {
	// #region Dependencias
	private dataFacade = inject(AttendancesDataFacade);
	protected crudFacade = inject(AttendancesCrudFacade);
	private cierresFacade = inject(AttendancesCierresFacade);
	protected uiFacade = inject(AttendancesUiFacade);
	protected store = inject(AttendancesAdminStore);
	private syncService = inject(CrossChexSyncStatusService);
	private confirmationService = inject(ConfirmationService);
	private messageService = inject(MessageService);
	private route = inject(ActivatedRoute);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del facade
	readonly vm = this.store.vm;

	/** `true` mientras hay un job de sync activo (QUEUED o RUNNING). */
	readonly syncActive = this.syncService.isActive;
	// #endregion

	// #region Estado local
	readonly activeTab = signal<string>('gestion');
	readonly fechaCalendar = signal<Date>(new Date());
	readonly tipoOptions = signal<{ label: string; value: TipoOperacionAsistencia }[]>([
		{ label: 'Solo entrada', value: 'entrada' },
		{ label: 'Solo salida', value: 'salida' },
		{ label: 'Entrada + Salida', value: 'completa' },
	]);
	readonly tipoPersonaOptions = signal<{ label: string; value: TipoPersonaFilter }[]>([
		{ label: 'Estudiantes', value: 'E' },
		{ label: 'Profesores', value: 'P' },
		{ label: 'Todos', value: 'todos' },
	]);
	readonly tipoPersonaFormOptions = signal<{ label: string; value: TipoPersonaAsistencia }[]>([
		{ label: 'Estudiante', value: 'E' },
		{ label: 'Profesor', value: 'P' },
	]);
	readonly cierreAnio = signal(new Date().getFullYear());
	readonly cierreMes = signal(new Date().getMonth() + 1);
	readonly cierreObservacion = signal('');
	readonly revertirObservacion = signal('');
	// #endregion

	// #region Skeleton config
	readonly tableColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'avatar-text' },
		{ width: '100px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '80px', cellType: 'badge' },
		{ width: '120px', cellType: 'actions' },
	];
	// #endregion

	// #region Computed
	readonly mesesOptions = computed(() =>
		Array.from({ length: 12 }, (_, i) => ({
			label: new Date(2000, i).toLocaleString('es', { month: 'long' }),
			value: i + 1,
		})),
	);

	readonly cierresActivos = computed(() => this.vm().cierres.filter((c) => c.activo));

	/** Fecha en formato DD/MM/YYYY para labels/dialogs. */
	readonly fechaLabel = computed(() => this.formatFecha(this.vm().fecha));

	/** Label del filtro activo ('Estudiantes' / 'Profesores' / 'Todos'). */
	readonly filtroLabel = computed(() => {
		const value = this.vm().tipoPersonaFilter;
		return this.tipoPersonaOptions().find((o) => o.value === value)?.label ?? 'Estudiantes';
	});

	readonly isFilterDefault = computed(() => this.vm().tipoPersonaFilter === 'E');
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.dataFacade.loadData();
		this.dataFacade.loadEstudiantes();
		// Plan 24 Chat 3 — recuperar sync activo tras refresh F5 + listener terminal.
		void this.syncService.rehydrate();
		this.subscribeToSyncTerminal();
		this.subscribeToQueryParams();
	}

	private subscribeToSyncTerminal(): void {
		this.syncService.terminal$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ status }) => {
				if (status.estado === 'COMPLETED') {
					this.messageService.add({
						severity: 'success',
						summary: 'Sincronización completada',
						detail: status.mensaje ?? 'Refrescando tabla…',
						life: 5000,
					});
					this.dataFacade.loadData();
					void this.syncService.stopTracking();
				} else if (status.estado === 'FAILED') {
					this.messageService.add({
						severity: 'error',
						summary: 'Error al sincronizar',
						detail: status.error ?? status.mensaje ?? 'Falló la sincronización CrossChex',
						life: 7000,
					});
				}
			});
	}

	// Cross-link desde `AttendanceDirectorComponent` tab profesores (Plan 23 Chat 5).
	// Query params soportados: `tab`, `tipoPersona`, `dni`, `fecha` (YYYY-MM-DD).
	private subscribeToQueryParams(): void {
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const tab = params.get('tab');
				if (tab === 'gestion' || tab === 'reportes') this.activeTab.set(tab);

				const fecha = params.get('fecha');
				if (fecha && isValidDateIso(fecha)) {
					this.fechaCalendar.set(parseIsoDate(fecha));
					this.dataFacade.onFechaChange(fecha);
				}

				const tipo = params.get('tipoPersona');
				if (tipo === 'E' || tipo === 'P' || tipo === 'todos') {
					this.dataFacade.onTipoPersonaChange(tipo);
				}

				const dni = params.get('dni');
				if (dni) this.dataFacade.onSearch(dni);
			});
	}
	// #endregion

	// #region Event handlers — filtros

	onFechaChange(date: Date): void {
		this.fechaCalendar.set(date);
		const iso = date.toISOString().split('T')[0];
		this.dataFacade.onFechaChange(iso);
	}

	onSearch(event: Event): void {
		const term = (event.target as HTMLInputElement).value;
		this.dataFacade.onSearch(term);
	}

	// #endregion


	// #region Event handlers — Sync

	onSincronizar(): void {
		const fechaLabel = this.fechaLabel();
		this.uiFacade.openConfirmDialog();
		this.confirmationService.confirm({
			message: `Se reemplazarán las marcaciones automáticas del ${fechaLabel}. Los registros editados manualmente se preservan. ¿Continuar?`,
			header: 'Sincronizar CrossChex',
			icon: 'pi pi-sync',
			acceptLabel: 'Sincronizar',
			rejectLabel: 'Cancelar',
			accept: () => this.dispatchSync(fechaLabel),
		});
	}

	onSyncRetry(): void {
		void this.syncService.stopTracking();
		this.dispatchSync(this.fechaLabel());
	}

	onSyncDismiss(): void {
		void this.syncService.stopTracking();
	}

	private dispatchSync(fechaLabel: string): void {
		this.dataFacade.sincronizarDesdeCrossChex((err) => {
			this.messageService.add({
				severity: 'error',
				summary: 'Error al sincronizar',
				detail: `No se pudo iniciar el sync del ${fechaLabel}.`,
				life: 5000,
			});
			logger.error('[AttendancesComponent] Sync dispatch error', err);
		});
	}

	// #endregion

	// #region Event handlers — Filtro tipo de persona

	onTipoPersonaFilterChange(tipo: TipoPersonaFilter): void {
		if (!tipo) return;
		this.dataFacade.onTipoPersonaChange(tipo);
	}

	onResetTipoPersonaFilter(): void {
		this.dataFacade.onTipoPersonaChange('E');
	}

	// #endregion

	// #region Event handlers — CRUD

	onNuevo(tipo: TipoOperacionAsistencia = 'entrada'): void {
		this.uiFacade.openNewDialog(tipo);
		// Asegurar que el selector del form tiene la lista de personas correcta.
		const fd = this.store.formData();
		this.dataFacade.loadPersonas(fd.tipoPersona);
	}

	onFormTipoPersonaChange(tipo: TipoPersonaAsistencia): void {
		if (!tipo) return;
		// Cambiar tipo resetea selección de persona y recarga el selector.
		this.store.updateFormData({ tipoPersona: tipo, estudianteId: null });
		this.dataFacade.loadPersonas(tipo);
	}

	onAgregarSalida(item: AsistenciaAdminLista): void {
		this.uiFacade.openSalidaDialog(item);
	}

	onEditar(item: AsistenciaAdminLista): void {
		this.uiFacade.openEditDialog(item);
	}

	onEliminar(item: AsistenciaAdminLista): void {
		this.uiFacade.openConfirmDialog();
		this.confirmationService.confirm({
			message: `¿Eliminar el registro de asistencia de ${item.nombreCompleto} del ${item.fecha}?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				this.crudFacade.delete(item);
			},
		});
	}

	onSave(): void {
		this.crudFacade.save();
	}

	// #endregion

	// #region Event handlers — cierre mensual

	onAbrirCierre(): void {
		this.dataFacade.loadCierres();
		this.uiFacade.openCierreDialog();
	}

	onCrearCierre(): void {
		const dto: CrearCierreMensualRequest = {
			sedeId: this.store.sedeId() ?? 0,
			anio: this.cierreAnio(),
			mes: this.cierreMes(),
			observacion: this.cierreObservacion() || undefined,
		};
		this.cierresFacade.crearCierre(dto);
		this.cierreObservacion.set('');
	}

	onRevertirCierre(cierreId: number, rowVersion: string): void {
		const observacion = this.revertirObservacion();
		if (observacion.length < 10) return;
		this.cierresFacade.revertirCierre(cierreId, { observacion, rowVersion } satisfies RevertirCierreMensualRequest);
		this.revertirObservacion.set('');
	}

	// #endregion

	// #region Dialog handlers

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDialog();
	}

	onCierreDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeCierreDialog();
	}

	onConfirmDialogHide(): void {
		this.uiFacade.closeConfirmDialog();
	}

	// #endregion

	// #region Helpers de template — delegan a funciones puras en ./services
	readonly getEstadoSeverity = estadoSeverity;
	readonly getOrigenLabel = origenLabel;
	readonly getOrigenSeverity = origenSeverity;
	readonly getTipoPersonaLabel = tipoPersonaLabel;
	private formatFecha = formatFechaIso;
	// #endregion
}
