import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';

import {
	AsistenciaService,
	AsistenciaDiaConEstadisticas,
	EstadisticasAsistenciaDia,
	EstudianteAsistencia,
	HijoApoderado,
} from '@core/services';
import { viewBlobInNewTab, downloadBlob } from '@core/helpers';
import { AttendanceDataService } from './attendance-data.service';
import { AttendanceTable } from '@features/intranet/pages/attendance-component/models/attendance.types';
import {
	VIEW_MODE,
	ViewMode,
} from '@app/features/intranet/components/attendance/attendance-header/attendance-header.component';
import { APP_USER_ROLES } from '@app/shared/constants';

const ATTENDANCE_TABLE_LABELS = {
	Ingresos: 'Ingresos',
	Salidas: 'Salidas',
} as const;

type MonthSubMode = 'mes' | 'periodo';

const MONTH_NAMES = [
	'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SUB_MODE_OPTIONS = [
	{ label: 'Mes', value: 'mes' as MonthSubMode },
	{ label: 'Periodo', value: 'periodo' as MonthSubMode },
];

const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));

// #region Interfaces de configuración

/** Contexto del selector actualmente activo (grado/salon → campos compartidos). */
export interface SelectorContext {
	grado: string;
	gradoCodigo: string;
	seccion: string;
}

/**
 * Configuración por-componente que abstrae las diferencias entre Director y Profesor.
 * Se pasa mediante init() en ngOnInit del componente contenedor.
 */
export interface AttendanceViewConfig {
	/** Cargar estudiantes con asistencias mensuales */
	loadEstudiantes(gradoCodigo: string, seccion: string, mes: number, anio: number): Observable<EstudianteAsistencia[]>;
	/** Cargar asistencias de un día específico con estadísticas */
	loadDia(
		gradoCodigo: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas>;
	/** Obtener contexto del selector actualmente seleccionado, o null si no hay selección */
	getSelectorContext(): SelectorContext | null;
	/** Callback al cambiar de mes — permite al componente re-seleccionar si el selector actual no aplica (filtro Verano) */
	onMonthChange(): void;
	/** Restaurar ID de estudiante desde storage */
	getStoredEstudianteId(): number | null;
	/** Guardar ID de estudiante en storage */
	setStoredEstudianteId(id: number): void;
}

/**
 * Servicio scoped que centraliza la lógica compartida entre las vistas
 * de asistencia de Director y Profesor: modo día/mes, selección de estudiante, tablas y PDF.
 *
 * Se configura por componente mediante init() con callbacks que abstraen
 * las diferencias de endpoint y storage.
 */
@Injectable()
export class AttendanceViewController {
	private asistenciaService = inject(AsistenciaService);
	private attendanceDataService = inject(AttendanceDataService);
	private destroyRef = inject(DestroyRef);
	private config!: AttendanceViewConfig;

	// Flow summary:
	// - Month mode: loadEstudiantes -> restoreSelectedEstudiante -> loadEstudianteAsistencias.
	// - Day mode: loadAsistenciaDia uses the selected date.
	// - Reload delegates to the active viewMode.

// #endregion
	// #region Estado general

	readonly loading = signal(false);
	readonly downloadingPdf = signal(false);
	readonly showSkeletons = signal(true);
	readonly tableReady = signal(false);

	// #endregion
	// #region Periodo (sub-modo dentro de mes)

	readonly monthSubMode = signal<MonthSubMode>('mes');
	readonly periodoInicio = signal(1);
	readonly periodoFin = signal(new Date().getMonth() + 1);

	/** Opciones estáticas para el toggle mes/periodo */
	readonly monthSubModeOptions = MONTH_SUB_MODE_OPTIONS;

	/** Año del periodo — siempre el año seleccionado en la tabla */
	readonly periodoYear = computed(() => this.ingresos().selectedYear);

	/** Mes máximo disponible: si es el año actual, hasta el mes actual; si es año pasado, todos */
	readonly maxPeriodoMonth = computed(() => {
		const selectedYear = this.ingresos().selectedYear;
		const now = new Date();
		return selectedYear >= now.getFullYear() ? now.getMonth() + 1 : 12;
	});

	/** Opciones de mes para INICIO: 1 hasta maxPeriodoMonth */
	readonly mesOptionsInicio = computed(() => {
		const max = this.maxPeriodoMonth();
		return MONTH_OPTIONS.filter((m) => m.value <= max);
	});

	/** Opciones de mes para FIN: desde periodoInicio hasta maxPeriodoMonth */
	readonly mesOptionsFin = computed(() => {
		const start = this.periodoInicio();
		const max = this.maxPeriodoMonth();
		return MONTH_OPTIONS.filter((m) => m.value >= start && m.value <= max);
	});

	/** Valida que el rango de periodo sea correcto */
	readonly isPeriodoValid = computed(() => this.periodoInicio() <= this.periodoFin());

	/** Label descriptivo para la sección PDF en modo periodo */
	readonly pdfLabel = computed(() => {
		const inicio = this.periodoInicio();
		const fin = this.periodoFin();
		const year = this.ingresos().selectedYear;
		return `Periodo: ${MONTH_NAMES[inicio - 1]} – ${MONTH_NAMES[fin - 1]} ${year}`;
	});

	setMonthSubMode(mode: MonthSubMode): void {
		this.monthSubMode.set(mode);
	}

	setPeriodoInicio(mes: number): void {
		this.periodoInicio.set(mes);
		// Auto-ajustar fin si queda por debajo del inicio
		if (this.periodoFin() < mes) {
			this.periodoFin.set(mes);
		}
	}

	setPeriodoFin(mes: number): void {
		this.periodoFin.set(mes);
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
	readonly estadisticasDia = signal<EstadisticasAsistenciaDia>({
		total: 0,
		temprano: 0,
		aTiempo: 0,
		fueraHora: 0,
		noAsistio: 0,
		justificado: 0,
		pendiente: 0,
	});

	// #endregion
	// #region Tablas de asistencia

	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable(ATTENDANCE_TABLE_LABELS.Ingresos),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable(ATTENDANCE_TABLE_LABELS.Salidas),
	);

	// #endregion
	// #region PDF

	// En mes mode usa el mes/año seleccionado; en día mode es la fecha seleccionada
	readonly pdfFecha = computed(() => {
		if (this.viewMode() === VIEW_MODE.Dia) {
			return this.fechaDia();
		}
		// Usar el primer día del mes/año seleccionado para reportes consolidados
		const { selectedMonth, selectedYear } = this.ingresos();
		return new Date(selectedYear, selectedMonth - 1, 1);
	});

	readonly pdfMenuItems = computed<MenuItem[]>(() => {
		const isMonthMode = this.viewMode() === VIEW_MODE.Mes;
		const isPeriodo = this.monthSubMode() === 'periodo';

		return [
			{
				label: 'Ver PDF',
				icon: 'pi pi-eye',
				command: () => {
					if (!isMonthMode) return this.verPdfAsistenciaDia();
					return isPeriodo ? this.verPdfAsistenciaPeriodo() : this.verPdfAsistenciaMes();
				},
			},
			{
				label: 'Descargar PDF',
				icon: 'pi pi-download',
				command: () => {
					if (!isMonthMode) return this.descargarPdfAsistenciaDia();
					return isPeriodo
						? this.descargarPdfAsistenciaPeriodo()
						: this.descargarPdfAsistenciaMes();
				},
			},
		];
	});

	// #endregion
	// #region Inicialización

	/**
	 * Inicializar con la configuración del componente contenedor.
	 * Debe llamarse en ngOnInit antes de cualquier otra operación.
	 */
	init(config: AttendanceViewConfig): void {
		this.config = config;
	}

	// #endregion
	// #region Estudiantes (modo mes)

	/**
	 * Cargar lista de estudiantes para el selector/grado actual.
	 * Restaura automáticamente la selección de estudiante si hay una guardada.
	 */
	loadEstudiantes(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.config
			.loadEstudiantes(ctx.gradoCodigo, ctx.seccion, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.estudiantes().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantes.set(estudiantes);
					if (estudiantes.length > 0) {
						this.restoreSelectedEstudiante();
						this.loadEstudianteAsistencias();
					}
				},
				error: () => {
					this.loading.set(false);
				},
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
		if (
			estudianteId !== null &&
			this.estudiantes().some((e) => e.estudianteId === estudianteId)
		) {
			this.selectedEstudianteId.set(estudianteId);
			return;
		}
		const first = this.estudiantes()[0];
		if (first) {
			this.selectedEstudianteId.set(first.estudianteId);
		}
	}

	private saveSelectedEstudiante(): void {
		const id = this.selectedEstudianteId();
		if (id) {
			this.config.setStoredEstudianteId(id);
		}
	}

	private loadEstudianteAsistencias(): void {
		const estudiante = this.selectedEstudiante();
		if (!estudiante) {
			this.loading.set(false);
			this.tableReady.set(true);
			return;
		}

		const { selectedMonth, selectedYear } = this.ingresos();

		const tables = this.attendanceDataService.processAsistencias(
			estudiante.asistencias,
			selectedMonth,
			selectedYear,
			estudiante.nombreCompleto,
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
		this.reloadEstudianteIngresos();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.config.onMonthChange();
		this.reloadEstudianteSalidas();
	}

	private reloadEstudianteIngresos(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.config
			.loadEstudiantes(ctx.gradoCodigo, ctx.seccion, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					this.estudiantes.set(estudiantes);
					const estudiante = estudiantes.find(
						(e) => e.estudianteId === this.selectedEstudianteId(),
					);
					if (estudiante) {
						const tables = this.attendanceDataService.processAsistencias(
							estudiante.asistencias,
							selectedMonth,
							selectedYear,
							estudiante.nombreCompleto,
						);
						this.ingresos.set(tables.ingresos);
					}
				},
			});
	}

	private reloadEstudianteSalidas(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.config
			.loadEstudiantes(ctx.gradoCodigo, ctx.seccion, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					const estudiante = estudiantes.find(
						(e) => e.estudianteId === this.selectedEstudianteId(),
					);
					if (estudiante) {
						const tables = this.attendanceDataService.processAsistencias(
							estudiante.asistencias,
							selectedMonth,
							selectedYear,
							estudiante.nombreCompleto,
						);
						this.salidas.set(tables.salidas);
					}
				},
			});
	}

	// #endregion
	// #region Modo día

	setViewMode(mode: ViewMode): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);

		if (mode === VIEW_MODE.Dia) {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantes();
		}
	}

	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadAsistenciaDia();
	}

	loadAsistenciaDia(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);

		this.config
			.loadDia(ctx.gradoCodigo, ctx.seccion, this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response) => {
					// ✅ Extraer estudiantes y estadísticas del response del backend
					this.estudiantesDia.set(response.estudiantes);
					this.estadisticasDia.set(response.estadisticas);
				},
			});
	}

	// #endregion
	// #region PDF

	/** Ver PDF en nueva pestaña */
	verPdfAsistenciaDia(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(ctx.gradoCodigo, ctx.seccion, this.pdfFecha())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	/** Descargar PDF directamente con nombre descriptivo */
	descargarPdfAsistenciaDia(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(ctx.gradoCodigo, ctx.seccion, this.pdfFecha())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const fechaStr = this.pdfFecha().toISOString().split('T')[0];
					downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_${fechaStr}.pdf`);
				},
			});
	}

	/** Ver PDF mensual de un salón en nueva pestaña */
	verPdfAsistenciaMes(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.descargarPdfAsistenciaMes(ctx.gradoCodigo, ctx.seccion, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	/** Descargar PDF mensual de un salón con nombre descriptivo */
	descargarPdfAsistenciaMes(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.descargarPdfAsistenciaMes(ctx.gradoCodigo, ctx.seccion, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const mes = selectedMonth.toString().padStart(2, '0');
					downloadBlob(
						blob,
						`Asistencia_${ctx.grado}_${ctx.seccion}_${selectedYear}-${mes}.pdf`,
					);
				},
			});
	}

	/** Ver PDF por periodo (rango de meses) en nueva pestaña */
	verPdfAsistenciaPeriodo(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx || !this.isPeriodoValid()) return;

		this.downloadingPdf.set(true);
		const mesI = this.periodoInicio();
		const mesF = this.periodoFin();
		const anio = this.ingresos().selectedYear;

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(ctx.gradoCodigo, ctx.seccion, mesI, anio, mesF, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	/** Descargar PDF por periodo (rango de meses) con nombre descriptivo */
	descargarPdfAsistenciaPeriodo(): void {
		const ctx = this.config.getSelectorContext();
		if (!ctx || !this.isPeriodoValid()) return;

		this.downloadingPdf.set(true);
		const mesI = this.periodoInicio();
		const mesF = this.periodoFin();
		const anio = this.ingresos().selectedYear;

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(ctx.gradoCodigo, ctx.seccion, mesI, anio, mesF, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const inicio = `${anio}-${mesI.toString().padStart(2, '0')}`;
					const fin = `${anio}-${mesF.toString().padStart(2, '0')}`;
					downloadBlob(
						blob,
						`Asistencia_${ctx.grado}_${ctx.seccion}_Periodo_${inicio}_a_${fin}.pdf`,
					);
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
}
