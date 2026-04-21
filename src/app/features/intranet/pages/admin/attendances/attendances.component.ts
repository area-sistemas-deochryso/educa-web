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

import { SkeletonColumnDef, TableSkeletonComponent, StatsSkeletonComponent } from '@shared/components';
import { AttendanceReportsComponent } from '../../cross-role/attendance-reports';

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
	SincronizarResultado,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
	isValidDateIso,
	parseIsoDate,
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
		AttendanceReportsComponent,
	],
	providers: [ConfirmationService, MessageService],
	templateUrl: './attendances.component.html',
	styleUrl: './attendances.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancesComponent implements OnInit {
	// #region Dependencias
	private dataFacade = inject(AttendancesDataFacade);
	private crudFacade = inject(AttendancesCrudFacade);
	private cierresFacade = inject(AttendancesCierresFacade);
	protected uiFacade = inject(AttendancesUiFacade);
	protected store = inject(AttendancesAdminStore);
	private confirmationService = inject(ConfirmationService);
	private messageService = inject(MessageService);
	private route = inject(ActivatedRoute);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado del facade
	readonly vm = this.store.vm;
	// #endregion

	// #region Estado local
	readonly activeTab = signal<string>('gestion');
	readonly fechaCalendar = signal<Date>(new Date());

	readonly tipoOptions = signal([
		{ label: 'Solo entrada', value: 'entrada' as TipoOperacionAsistencia },
		{ label: 'Solo salida', value: 'salida' as TipoOperacionAsistencia },
		{ label: 'Entrada + Salida', value: 'completa' as TipoOperacionAsistencia },
	]);

	readonly tipoPersonaOptions = signal([
		{ label: 'Estudiantes', value: 'E' as TipoPersonaFilter },
		{ label: 'Profesores', value: 'P' as TipoPersonaFilter },
		{ label: 'Todos', value: 'todos' as TipoPersonaFilter },
	]);

	readonly tipoPersonaFormOptions = signal([
		{ label: 'Estudiante', value: 'E' as TipoPersonaAsistencia },
		{ label: 'Profesor', value: 'P' as TipoPersonaAsistencia },
	]);

	// Cierre mensual form
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

		// Cross-link desde `AttendanceDirectorComponent` tab profesores (Plan 23 Chat 5).
		// Query params soportados: `tab`, `tipoPersona`, `dni`, `fecha` (YYYY-MM-DD).
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const tab = params.get('tab');
				if (tab === 'gestion' || tab === 'reportes') {
					this.activeTab.set(tab);
				}

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
				if (dni) {
					this.dataFacade.onSearch(dni);
				}
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

	// #region Event handlers — Selección y correos

	onToggleSelection(id: number): void {
		this.store.toggleSelection(id);
	}

	onToggleSelectAll(): void {
		this.store.toggleSelectAll();
	}

	onEnviarCorreos(): void {
		this.crudFacade.enviarCorreos();
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
			accept: () => {
				this.dataFacade.sincronizarDesdeCrossChex(
					(res) => this.showSyncSuccessToast(res, fechaLabel),
					() => this.showSyncErrorToast(fechaLabel),
				);
			},
		});
	}

	private showSyncSuccessToast(res: SincronizarResultado, fechaLabel: string): void {
		const e = res.estudiantes;
		const p = res.profesores;
		const preservados = e.preservados + p.preservados;
		this.messageService.add({
			severity: 'success',
			summary: 'Sincronización completada',
			detail: `Fecha ${fechaLabel}: ${e.nuevos} estudiantes + ${p.nuevos} profesores importados, ${preservados} preservados (editados manualmente)`,
			life: 7000,
		});
	}

	private showSyncErrorToast(fechaLabel: string): void {
		this.messageService.add({
			severity: 'error',
			summary: 'Error al sincronizar',
			detail: `No se pudo sincronizar CrossChex del ${fechaLabel}.`,
			life: 5000,
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
		const obs = this.revertirObservacion();
		if (obs.length < 10) return;

		const dto: RevertirCierreMensualRequest = {
			observacion: obs,
			rowVersion,
		};
		this.cierresFacade.revertirCierre(cierreId, dto);
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

	// #region Helpers de template

	getEstadoSeverity(estado: string): 'success' | 'warn' {
		return estado === 'Completa' ? 'success' : 'warn';
	}

	getOrigenLabel(item: AsistenciaAdminLista): string {
		if (item.editadoManualmente) return 'Editado';
		if (item.origenManual) return 'Manual';
		return 'Biométrico';
	}

	getOrigenSeverity(item: AsistenciaAdminLista): 'warn' | 'info' | 'secondary' {
		if (item.editadoManualmente) return 'warn';
		if (item.origenManual) return 'info';
		return 'secondary';
	}

	getTipoPersonaLabel(tipo: TipoPersonaAsistencia): string {
		return tipo === 'P' ? 'Profesor' : 'Estudiante';
	}

	/** "yyyy-MM-dd" → "dd/MM/yyyy". */
	private formatFecha(iso: string): string {
		if (!iso || iso.length < 10) return iso;
		const [y, m, d] = iso.slice(0, 10).split('-');
		return `${d}/${m}/${y}`;
	}

	// #endregion
}
