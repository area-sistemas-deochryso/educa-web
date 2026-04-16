import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
	EstudianteAsistencia,
	HijoApoderado,
	AttendanceSignalRService,
} from '@core/services';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { logger } from '@core/helpers';
import { AttendanceDataService } from './attendance-data.service';
import { AttendancePdfService } from './attendance-pdf.service';
import { AttendanceStatsService } from './attendance-stats.service';
import { AttendanceTable } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import {
	VIEW_MODE,
	ViewMode,
} from '@app/features/intranet/components/attendance/attendance-header/attendance-header.component';
import { APP_USER_ROLES } from '@app/shared/constants';
import { AttendanceViewConfig } from './attendance-view.models';

const ATTENDANCE_TABLE_LABELS = {
	Ingresos: 'Ingresos',
	Salidas: 'Salidas',
} as const;

/**
 * Servicio scoped que centraliza la lógica compartida entre las vistas
 * de asistencia de Director y Profesor: modo día/mes, selección de estudiante, tablas y PDF.
 *
 * Delega generación de PDFs a AttendancePdfService y estadísticas/periodo
 * a AttendanceStatsService.
 */
@Injectable()
export class AttendanceViewController {
	private attendanceDataService = inject(AttendanceDataService);
	private asistenciaSignalR = inject(AttendanceSignalRService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);
	private config!: AttendanceViewConfig;

	// Flow summary:
	// - Month mode: loadEstudiantes -> restoreSelectedEstudiante -> loadEstudianteAsistencias.
	// - Day mode: loadAsistenciaDia uses the selected date.
	// - Reload delegates to the active viewMode.

	// #region Servicios delegados (accesibles desde componentes)
	readonly pdf = inject(AttendancePdfService);
	readonly stats = inject(AttendanceStatsService);
	// #endregion

	// #region Estado general
	readonly loading = signal(false);
	readonly showSkeletons = signal(true);
	readonly tableReady = signal(false);
	// #endregion

	// #region Delegados de stats/periodo
	readonly monthSubMode = this.stats.monthSubMode;
	readonly periodoInicio = this.stats.periodoInicio;
	readonly periodoFin = this.stats.periodoFin;
	readonly monthSubModeOptions = this.stats.monthSubModeOptions;
	readonly periodoYear = this.stats.periodoYear;
	readonly maxPeriodoMonth = this.stats.maxPeriodoMonth;
	readonly mesOptionsInicio = this.stats.mesOptionsInicio;
	readonly mesOptionsFin = this.stats.mesOptionsFin;
	readonly isPeriodoValid = this.stats.isPeriodoValid;
	readonly pdfLabel = this.stats.pdfLabel;
	readonly estadisticasDia = this.stats.estadisticasDia;

	setMonthSubMode(mode: 'mes' | 'periodo'): void {
		this.stats.setMonthSubMode(mode);
	}
	setPeriodoInicio(mes: number): void {
		this.stats.setPeriodoInicio(mes);
	}
	setPeriodoFin(mes: number): void {
		this.stats.setPeriodoFin(mes);
	}
	// #endregion

	// #region Estudiantes (modo mes)
	readonly estudiantes = signal<EstudianteAsistencia[]>([]);
	readonly selectedEstudianteId = signal<number | null>(null);
	readonly selectedEstudiante = computed(() => {
		const id = this.selectedEstudianteId();
		return this.estudiantes().find((e) => e.estudianteId === id) || null;
	});

	// Adaptador para reusar el selector de hijos en la vista de estudiantes
	readonly estudiantesAsHijos = computed<HijoApoderado[]>(() => {
		return this.estudiantes().map((e) => ({
			estudianteId: e.estudianteId,
			dni: e.dni,
			nombreCompleto: e.nombreCompleto,
			grado: e.grado,
			seccion: e.seccion,
			relacion: APP_USER_ROLES.Estudiante,
		}));
	});
	// #endregion

	// #region Modo día/mes
	readonly viewMode = signal<ViewMode>(VIEW_MODE.Dia);
	readonly fechaDia = signal<Date>(new Date());
	readonly estudiantesDia = signal<EstudianteAsistencia[]>([]);
	// #endregion

	// #region Tablas de asistencia
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable(ATTENDANCE_TABLE_LABELS.Ingresos),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable(ATTENDANCE_TABLE_LABELS.Salidas),
	);
	// #endregion

	// #region PDF (computed de fecha)
	readonly pdfFecha = computed(() => {
		if (this.viewMode() === VIEW_MODE.Dia) {
			return this.fechaDia();
		}
		const { selectedMonth, selectedYear } = this.ingresos();
		return new Date(selectedYear, selectedMonth - 1, 1);
	});
	// #endregion

	// #region Inicialización

	/**
	 * Inicializar con la configuración del componente contenedor.
	 * Debe llamarse en ngOnInit antes de cualquier otra operación.
	 */
	init(config: AttendanceViewConfig): void {
		this.config = config;
		this.pdf.init(() => this.config.getSelectorContext());
		this.setupSignalR();
	}

	// #endregion
	// #region Carga de estudiantes (modo mes)

	/**
	 * Cargar lista de estudiantes para el selector/grado actual.
	 * Restaura automáticamente la selección de estudiante si hay una guardada.
	 */
	loadEstudiantes(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) { this.loading.set(false); return; }

		this.loading.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.config
			.loadEstudiantes(ctx.grado, ctx.seccion, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => { if (this.estudiantes().length === 0) this.loading.set(false); }),
			)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantes.set(estudiantes);
					if (estudiantes.length > 0) {
						this.restoreSelectedEstudiante();
						this.loadEstudianteAsistencias();
					}
				},
				error: () => this.loading.set(false),
			});
	}

	selectEstudiante(estudianteId: number): void {
		if (this.selectedEstudianteId() === estudianteId) return;
		this.selectedEstudianteId.set(estudianteId);
		this.saveSelectedEstudiante();
		this.loadEstudianteAsistencias();
	}

	private restoreSelectedEstudiante(): void {
		const estudianteId = this.config.getStoredEstudianteId();
		if (estudianteId !== null && this.estudiantes().some((e) => e.estudianteId === estudianteId)) {
			this.selectedEstudianteId.set(estudianteId);
			return;
		}
		const first = this.estudiantes()[0];
		if (first) this.selectedEstudianteId.set(first.estudianteId);
	}

	private saveSelectedEstudiante(): void {
		const id = this.selectedEstudianteId();
		if (id) this.config.setStoredEstudianteId(id);
	}

	private loadEstudianteAsistencias(): void {
		const estudiante = this.selectedEstudiante();
		if (!estudiante) { this.loading.set(false); this.tableReady.set(true); return; }
		const { selectedMonth, selectedYear } = this.ingresos();
		const tables = this.attendanceDataService.processAsistencias(
			estudiante.asistencias, selectedMonth, selectedYear, estudiante.nombreCompleto,
		);
		this.ingresos.set(tables.ingresos);
		this.salidas.set(tables.salidas);
		this.loading.set(false);
		this.tableReady.set(true);
	}

	// #endregion
	// #region Cambio de mes

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.config.onMonthChange();
		this.syncSelectedYear();
		this.reloadEstudianteIngresos();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.config.onMonthChange();
		this.reloadEstudianteSalidas();
	}

	/** Sincroniza el año seleccionado en ingresos con el stats service */
	private syncSelectedYear(): void {
		this.stats.setSelectedYear(this.ingresos().selectedYear);
	}

	private reloadEstudianteIngresos(): void { this.reloadEstudianteTable('ingresos'); }
	private reloadEstudianteSalidas(): void { this.reloadEstudianteTable('salidas'); }

	private reloadEstudianteTable(kind: 'ingresos' | 'salidas'): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;
		const source = kind === 'ingresos' ? this.ingresos() : this.salidas();
		const { selectedMonth, selectedYear } = source;

		this.config
			.loadEstudiantes(ctx.grado, ctx.seccion, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					if (kind === 'ingresos') this.estudiantes.set(estudiantes);
					const estudiante = estudiantes.find((e) => e.estudianteId === this.selectedEstudianteId());
					if (!estudiante) return;
					const tables = this.attendanceDataService.processAsistencias(
						estudiante.asistencias,
						selectedMonth,
						selectedYear,
						estudiante.nombreCompleto,
					);
					if (kind === 'ingresos') this.ingresos.set(tables.ingresos);
					else this.salidas.set(tables.salidas);
				},
			});
	}

	// #endregion
	// #region Modo día

	setViewMode(mode: ViewMode): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);
		if (mode === VIEW_MODE.Dia) this.loadAsistenciaDia();
		else this.loadEstudiantes();
	}

	onFechaDiaChange(fecha: Date): void { this.fechaDia.set(fecha); this.loadAsistenciaDia(); }

	loadAsistenciaDia(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) { this.loading.set(false); return; }
		this.loading.set(true);
		this.config
			.loadDia(ctx.grado, ctx.seccion, this.fechaDia())
			.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
			.subscribe({
				next: (response) => {
					this.estudiantesDia.set(response.estudiantes);
					this.stats.setEstadisticasDia(response.estadisticas);
				},
			});
	}

	// #endregion
	// #region Reload

	reload(): void {
		if (this.viewMode() === VIEW_MODE.Dia) {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantes();
		}
	}

	// #endregion
	// #region SignalR

	private setupSignalR(): void {
		this.asistenciaSignalR.connect().catch((err) => {
			logger.warn('AttendanceView: No se pudo conectar a AsistenciaHub', err);
		});

		this.asistenciaSignalR.asistenciaRegistrada$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.swService.invalidateCacheByPattern('/api/ConsultaAsistencia').then(() => this.reloadAfterSignalR());
			});
	}

	private reloadAfterSignalR(): void {
		if (this.viewMode() === VIEW_MODE.Dia) {
			if (isToday(this.fechaDia())) this.loadAsistenciaDia();
			return;
		}
		const now = new Date();
		const { selectedMonth, selectedYear } = this.ingresos();
		if (selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()) {
			this.loadEstudiantes();
		}
	}

	// #endregion
}

function isToday(fecha: Date): boolean {
	const hoy = new Date();
	return (
		fecha.getFullYear() === hoy.getFullYear() &&
		fecha.getMonth() === hoy.getMonth() &&
		fecha.getDate() === hoy.getDate()
	);
}
