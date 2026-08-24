/* eslint-disable max-lines -- Razón: orchestrador del módulo admin de asistencias (filtros + tabs + form CRUD + cierres mensuales + sync CrossChex + queryParams cross-link). 8 dominios coordinados; partir aumenta indirección sin reducir complejidad real. */
// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { logger } from '@core/helpers';
import { ErrorStateComponent } from '@shared/components';
import { SkeletonColumnDef, TableSkeletonComponent, StatsSkeletonComponent, PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';
import { AttendanceScopeBannerComponent } from '@intranet-shared/components/attendance-scope-banner';
import { AttendanceReportsComponent } from '../../cross-role/attendance-reports';
import { AttendancePanelComponent } from '../attendance-panel';
import { CrossChexSyncStatusService } from '@core/services/signalr';
import { CrossChexSyncBannerComponent } from './components/crosschex-sync-banner';
import { SyncRangeDialogComponent, SyncRangePayload } from './components/sync-range-dialog';

import {
	AttendancesAdminService,
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
import { EduCheckbox, EduConfirmDialog, EduConfirmationService, EduDatePicker, EduDialog, EduIconField, EduInputIcon, EduInputText, EduMessageService, EduSelect, EduSelectButton, EduTab, EduTabPanel, EduTable, EduTabs, EduTag, EduToast, EduTooltip } from '@edu-ui';
// #endregion

@Component({
	selector: 'app-attendances-admin',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		EduDatePicker,
		EduConfirmDialog,
		EduDialog,
		EduIconField,
		EduInputIcon,
		EduInputText,
		EduSelect,
		EduSelectButton,
		EduTable,
		EduTag,
		EduToast,
		EduTooltip,
		EduCheckbox,
		TableSkeletonComponent,
		StatsSkeletonComponent,
		KpiStatsComponent,
		EduTabs,
		EduTab,
		EduTabPanel,
		AttendanceScopeBannerComponent,
		AttendanceReportsComponent,
		AttendancePanelComponent,
		CrossChexSyncBannerComponent,
		SyncRangeDialogComponent,
		PageHeaderComponent,
		ErrorStateComponent],
	providers: [EduConfirmationService, EduMessageService],
	templateUrl: './attendances.component.html',
	styleUrl: './attendances.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancesComponent implements OnInit {
	// #region Dependencias
	private adminApi = inject(AttendancesAdminService);
	protected dataFacade = inject(AttendancesDataFacade);
	protected crudFacade = inject(AttendancesCrudFacade);
	private cierresFacade = inject(AttendancesCierresFacade);
	protected uiFacade = inject(AttendancesUiFacade);
	protected store = inject(AttendancesAdminStore);
	private syncService = inject(CrossChexSyncStatusService);
	private confirmationService = inject(EduConfirmationService);
	private messageService = inject(EduMessageService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del facade
	readonly vm = this.store.vm;

	/** `true` mientras hay un job de sync activo (QUEUED o RUNNING). */
	readonly syncActive = this.syncService.isActive;
	// #endregion

	// #region Stats KPI
	readonly statsItems = computed<KpiStatItem[]>(() => {
		const stats = this.vm().estadisticas;
		if (!stats) return [];

		const mostrarSublabel =
			this.vm().tipoPersonaFilter === 'todos' &&
			(stats.totalProfesores > 0 || stats.totalAsistentesAdmin > 0);

		return [
			{
				icon: 'pi pi-users',
				label: 'Total registros',
				value: stats.totalRegistros,
				sublabel: mostrarSublabel
					? `${stats.totalProfesores} profesores · ${stats.totalAsistentesAdmin} asistentes admin.`
					: undefined,
			},
			{ icon: 'pi pi-check-circle', label: 'Completas', value: stats.completas },
			{ icon: 'pi pi-exclamation-circle', label: 'Incompletas', value: stats.incompletas },
			{ icon: 'pi pi-pencil', label: 'Manuales', value: stats.registrosManuales }];
	});
	// #endregion

	// #region Estado local
	readonly activeTab = signal<string>('gestion');
	readonly fechaCalendar = signal<Date>(new Date());
	readonly tipoOptions = signal<{ label: string; value: TipoOperacionAsistencia }[]>([
		{ label: 'Solo entrada', value: 'entrada' },
		{ label: 'Solo salida', value: 'salida' },
		{ label: 'Entrada + Salida', value: 'completa' }]);
	readonly tipoPersonaOptions = signal<{ label: string; value: TipoPersonaFilter }[]>([
		{ label: 'Estudiantes', value: 'E' },
		{ label: 'Profesores', value: 'P' },
		{ label: 'Asist. Admin.', value: 'A' },
		{ label: 'Coordinadores', value: 'C' },
		{ label: 'Promotores', value: 'M' },
		{ label: 'Todos', value: 'todos' }]);
	readonly tipoPersonaFormOptions = signal<{ label: string; value: TipoPersonaAsistencia }[]>([
		{ label: 'Estudiante', value: 'E' },
		{ label: 'Profesor', value: 'P' },
		{ label: 'Asistente Admin.', value: 'A' },
		{ label: 'Coordinador', value: 'C' },
		{ label: 'Promotor', value: 'M' }]);
	readonly cierreAnio = signal(new Date().getFullYear());
	readonly cierreMes = signal(new Date().getMonth() + 1);
	readonly cierreObservacion = signal('');
	readonly revertirObservacion = signal('');
	readonly syncRangeDialogVisible = signal(false);
	readonly cierreSaving = signal(false);
	readonly revertSaving = signal(false);
	// #endregion

	// #region Skeleton config
	readonly tableColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'avatar-text' },
		{ width: '100px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '80px', cellType: 'badge' },
		{ width: '120px', cellType: 'actions' }];
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
		this.dataFacade.loadEstudiantes();
		// Plan 24 Chat 3 — recuperar sync activo tras refresh F5 + listener terminal.
		void this.syncService.rehydrate();
		this.subscribeToSyncTerminal();
		// `subscribeToQueryParams` aplica los queryParams al store y dispara
		// `loadData()` una sola vez con todos los filtros (incluido el deep-link
		// `?dni=...`). Evita el race que tenía `loadData()` en ngOnInit + handlers
		// individuales (cada uno bloqueado por el guard `loading()`).
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

	/**
	 * Brief 512 — `<p-tabs [value]="activeTab()">` era un binding de solo lectura: PrimeNG
	 * maneja el cambio de tab internamente (el panel se actualiza visualmente) pero sin
	 * `(valueChange)` nunca se notificaba al componente, así que la URL (`?tab=...`) y el
	 * signal `activeTab` quedaban stale — sin bookmark posible y F5 siempre volvía a "gestion".
	 * Mismo patrón que `TicketAdminComponent.onTabChange`: navega con el nuevo `tab` en
	 * queryParams; `subscribeToQueryParams` recibe el cambio y sincroniza `activeTab`.
	 */
	onTabChange(value: string | number | undefined): void {
		if (value === undefined) return;
		void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: String(value) } });
	}

	// Cross-link desde `AttendanceDirectorComponent` tab profesores (Plan 23 Chat 5).
	// Query params soportados: `tab`, `tipoPersona`, `dni`, `fecha` (YYYY-MM-DD).
	//
	// Aplica los params al store y dispara UN solo `loadData()` al final con
	// todos los filtros ya seteados (fecha + tipoPersona + search). Sin el
	// batch, los handlers individuales corrían en cascada y el guard `loading()`
	// bloqueaba los subsiguientes — solo el primer GET salía con filtros stale.
	private subscribeToQueryParams(): void {
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const tab = params.get('tab');
				if (tab === 'gestion' || tab === 'reportes' || tab === 'panel') this.activeTab.set(tab);

				const fecha = params.get('fecha');
				if (fecha && isValidDateIso(fecha)) {
					this.fechaCalendar.set(parseIsoDate(fecha));
					this.store.setFecha(fecha);
				}

				const tipo = params.get('tipoPersona');
				if (tipo === 'E' || tipo === 'P' || tipo === 'A' || tipo === 'C' || tipo === 'M' || tipo === 'todos') {
					this.store.setTipoPersonaFilter(tipo);
				}

				const dni = params.get('dni');
				if (dni) this.store.setSearchTerm(dni);

				this.store.setStatsReady(false);
				this.store.setTableReady(false);
				this.dataFacade.loadData();
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

	// #region Event handlers — drill-down
	/** Mirror inverso de `AttendancePanelComponent.irAGestion/irAReportes` — vuelve al tab Panel. */
	irAPanel(): void {
		void this.router.navigate([], { queryParams: { tab: 'panel' } });
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

	onSincronizarRango(): void {
		this.dataFacade.loadAllPersonas();
		this.syncRangeDialogVisible.set(true);
	}

	onDebugPagination(): void {
		const fecha = this.vm().fecha;
		this.adminApi.debugCrossChexPagination(fecha).subscribe({
			next: (res) => {
				logger.debug('[CrossChex Pagination]', res);
				this.messageService.add({
					severity: 'info',
					summary: 'Debug pagination',
					detail: JSON.stringify(res, null, 2),
					life: 30000,
				});
			},
			error: (err) => {
				logger.error('[CrossChex Pagination] Error', err);
				this.messageService.add({
					severity: 'error',
					summary: 'Debug pagination error',
					detail: err?.message ?? 'Error desconocido',
				});
			},
		});
	}

	onSyncRangeConfirm(payload: SyncRangePayload): void {
		this.confirmationService.confirm({
			message: `Se sincronizarán ${this.calcDays(payload.fechaInicio, payload.fechaFin)} día(s) desde CrossChex. ${payload.dnis ? `Filtrado a ${payload.dnis.length} persona(s).` : 'Todos los usuarios.'} ¿Continuar?`,
			header: 'Sincronizar rango',
			icon: 'pi pi-sync',
			acceptLabel: 'Sincronizar',
			rejectLabel: 'Cancelar',
			accept: () => {
				this.dataFacade.sincronizarRango(
					{ fechaInicio: payload.fechaInicio, fechaFin: payload.fechaFin, dnis: payload.dnis },
					(err) => {
						this.messageService.add({
							severity: 'error',
							summary: 'Error al sincronizar rango',
							detail: 'No se pudo iniciar la sincronización del rango.',
							life: 5000,
						});
						logger.error('[AttendancesComponent] Sync range dispatch error', err);
					},
				);
			},
		});
	}

	private calcDays(start: string, end: string): number {
		const diff = new Date(end).getTime() - new Date(start).getTime();
		return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
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
		// Cambiar tipo resetea selección de persona (y su sedeId derivada) y recarga el selector.
		this.store.updateFormData({ tipoPersona: tipo, estudianteId: null, sedeId: null });
		this.dataFacade.loadPersonas(tipo);
	}

	/**
	 * Brief 204 — el filtro del `p-select` de personas dispara búsqueda
	 * server-side. PrimeNG emite `{ originalEvent, filter }`; delegamos al
	 * trigger debounced del facade para evitar 1 request por tecla.
	 */
	onPersonaFilter(event: { filter: string }): void {
		const tipo = this.store.formData().tipoPersona;
		this.dataFacade.searchPersonas(tipo, event?.filter ?? '');
	}

	/**
	 * F-018 fix: el form no tiene sede picker propio en esta página, así que `formData.sedeId`
	 * vivía en `null` y `isFormValid` quedaba bloqueado para los 3 tipos (E/P/A). La persona
	 * seleccionada ya trae su `sedeId` desde BE; lo copiamos al form para destrabar la validación.
	 */
	onPersonaSelected(personaId: number | null): void {
		if (personaId === null) {
			this.store.updateFormData({ estudianteId: null, sedeId: null });
			return;
		}
		const persona = this.store.personas().find((p) => p.estudianteId === personaId);
		this.store.updateFormData({
			estudianteId: personaId,
			sedeId: persona?.sedeId ?? null,
		});
	}

	setHoraEntradaNow(): void {
		this.store.updateFormData({ horaEntrada: new Date() });
	}

	setHoraSalidaNow(): void {
		this.store.updateFormData({ horaSalida: new Date() });
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
		this.confirmationService.confirm({
			message: `¿Cerrar el mes ${this.cierreMes()}/${this.cierreAnio()}? Esta acción bloqueará las mutaciones de asistencia del período.`,
			header: 'Confirmar cierre mensual',
			icon: 'pi pi-lock',
			acceptLabel: 'Cerrar mes',
			rejectLabel: 'Cancelar',
			accept: () => {
				this.cierreSaving.set(true);
				this.cierresFacade.crearCierre(dto, () => this.cierreSaving.set(false));
				this.cierreObservacion.set('');
			},
		});
	}

	onRevertirCierre(cierreId: number, rowVersion: string): void {
		const observacion = this.revertirObservacion();
		if (observacion.length < 10) return;
		this.revertSaving.set(true);
		this.cierresFacade.revertirCierre(
			cierreId,
			{ observacion, rowVersion } satisfies RevertirCierreMensualRequest,
			() => this.revertSaving.set(false),
		);
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
