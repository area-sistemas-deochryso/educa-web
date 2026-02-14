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

// #region Interfaces de configuraciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n

/** Contexto del selector actualmente activo (grado/salon ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ campos compartidos). */
export interface SelectorContext {
	grado: string;
	gradoCodigo: string;
	seccion: string;
}

/**
 * ConfiguraciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n por-componente que abstrae las diferencias entre Director y Profesor.
 * Se pasa mediante init() en ngOnInit del componente contenedor.
 */
export interface AttendanceViewConfig {
	/** Cargar estudiantes con asistencias mensuales */
	loadEstudiantes(gradoCodigo: string, seccion: string, mes: number, anio: number): Observable<EstudianteAsistencia[]>;
	/** Cargar asistencias de un dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico con estadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas */
	loadDia(
		gradoCodigo: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas>;
	/** Obtener contexto del selector actualmente seleccionado, o null si no hay selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n */
	getSelectorContext(): SelectorContext | null;
	/** Callback al cambiar de mes ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â permite al componente re-seleccionar si el selector actual no aplica (filtro Verano) */
	onMonthChange(): void;
	/** Restaurar ID de estudiante desde storage */
	getStoredEstudianteId(): number | null;
	/** Guardar ID de estudiante en storage */
	setStoredEstudianteId(id: number): void;
}

/**
 * Servicio scoped que centraliza la lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³gica compartida entre las vistas
 * de asistencia de Director y Profesor: modo dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a/mes, selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de estudiante, tablas y PDF.
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
	// #region Modo dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a/mes

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

	// En mes mode usa el mes/aÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±o seleccionado; en dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a mode es la fecha seleccionada
	readonly pdfFecha = computed(() => {
		if (this.viewMode() === VIEW_MODE.Dia) {
			return this.fechaDia();
		}
		// Usar el primer dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a del mes/aÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±o seleccionado para reportes consolidados
		const { selectedMonth, selectedYear } = this.ingresos();
		return new Date(selectedYear, selectedMonth - 1, 1);
	});

	readonly pdfMenuItems: MenuItem[] = [
		{
			label: 'Ver PDF',
			icon: 'pi pi-eye',
			command: () => this.verPdfAsistenciaDia(),
		},
		{
			label: 'Descargar PDF',
			icon: 'pi pi-download',
			command: () => this.descargarPdfAsistenciaDia(),
		},
	];

	// #endregion
	// #region InicializaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n

	/**
	 * Inicializar con la configuraciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n del componente contenedor.
	 * Debe llamarse en ngOnInit antes de cualquier otra operaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n.
	 */
	init(config: AttendanceViewConfig): void {
		this.config = config;
	}

	// #endregion
	// #region Estudiantes (modo mes)

	/**
	 * Cargar lista de estudiantes para el selector/grado actual.
	 * Restaura automÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ticamente la selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de estudiante si hay una guardada.
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
	// #region Modo dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a

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
					// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Extraer estudiantes y estadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas del response del backend
					this.estudiantesDia.set(response.estudiantes);
					this.estadisticasDia.set(response.estadisticas);
				},
			});
	}

	// #endregion
	// #region PDF

	/** Ver PDF en nueva pestaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±a */
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
				next: (blob) => {
					const url = window.URL.createObjectURL(blob);
					window.open(url, '_blank');

					// Cleanup despuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de que la ventana se abra
					setTimeout(() => window.URL.revokeObjectURL(url), 100);
				},
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
					const url = window.URL.createObjectURL(blob);

					const a = document.createElement('a');
					a.href = url;
					const fechaStr = this.pdfFecha().toISOString().split('T')[0];
					a.download = `Asistencia_${ctx.grado}_${ctx.seccion}_${fechaStr}.pdf`;

					document.body.appendChild(a);
					a.click();

					// Cleanup
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
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
