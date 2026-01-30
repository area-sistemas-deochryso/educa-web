import {
	AsistenciaService,
	EstadisticasDia,
	EstudianteAsistencia,
	GradoSeccion,
	HijoApoderado,
	StorageService,
} from '@core/services';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { AsistenciaDiaListComponent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '../../../components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { EstadisticasDiaComponent } from '../../../components/attendance/estadisticas-dia/estadisticas-dia.component';
import { GradoSeccionSelectorComponent } from '../../../components/attendance/grado-seccion-selector/grado-seccion-selector.component';
import { ViewMode } from '../../../components/attendance/attendance-header/attendance-header.component';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Directores.
 * Maneja grados/secciones, estadísticas del día, descarga de PDF y modo día/mes.
 */
@Component({
	selector: 'app-attendance-director',
	standalone: true,
	imports: [
		AttendanceTableComponent,
		AttendanceTableSkeletonComponent,
		GradoSeccionSelectorComponent,
		EstadisticasDiaComponent,
		AsistenciaDiaListComponent,
		EmptyStateComponent,
		AttendanceLegendComponent,
	],
	templateUrl: './attendance-director.component.html',
})
export class AttendanceDirectorComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);
	private destroyRef = inject(DestroyRef);

	// Estado
	readonly loading = signal(false);
	readonly downloadingPdf = signal(false);

	// Progressive Rendering flags
	readonly showSkeletons = signal(true);
	readonly tableReady = signal(false);

	// Grados y secciones
	private readonly allGradosSecciones = signal<GradoSeccion[]>([]);
	readonly gradosSecciones = computed(() => {
		const all = this.allGradosSecciones();
		const month = this.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		return all.filter((gs) =>
			isVerano
				? gs.seccion.toUpperCase() === 'V'
				: gs.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedGradoSeccion = signal<GradoSeccion | null>(null);

	// Estadísticas del día
	readonly estadisticasDia = signal<EstadisticasDia | null>(null);

	// Estudiantes (modo mes)
	readonly estudiantes = signal<EstudianteAsistencia[]>([]);
	readonly selectedEstudianteId = signal<number | null>(null);
	readonly selectedEstudiante = computed(() => {
		const id = this.selectedEstudianteId();
		return this.estudiantes().find((e) => e.estudianteId === id) || null;
	});

	// Transformar estudiantes a HijoApoderado para reusar selector
	readonly estudiantesAsHijos = computed<HijoApoderado[]>(() => {
		return this.estudiantes().map((e) => ({
			estudianteId: e.estudianteId,
			dni: e.dni,
			nombreCompleto: e.nombreCompleto,
			grado: e.grado,
			seccion: e.seccion,
			relacion: 'Estudiante',
		}));
	});

	// Modo día/mes
	readonly viewMode = signal<ViewMode>('dia');
	readonly fechaDia = signal<Date>(new Date());
	readonly estudiantesDia = signal<EstudianteAsistencia[]>([]);

	// Tablas de asistencia
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Salidas'),
	);

	ngOnInit(): void {
		this.restoreSelectedMonth();
		this.loadGradosSecciones();
	}

	private restoreSelectedMonth(): void {
		const data = this.storage.getAttendanceMonth();
		if (data) {
			this.ingresos.update((table) => ({
				...table,
				selectedMonth: data.month,
				selectedYear: data.year,
			}));
			this.salidas.update((table) => ({
				...table,
				selectedMonth: data.month,
				selectedYear: data.year,
			}));
		}
	}

	private saveSelectedMonth(): void {
		this.storage.setAttendanceMonth({
			month: this.ingresos().selectedMonth,
			year: this.ingresos().selectedYear,
		});
	}

	// === GRADOS Y SECCIONES ===

	private loadGradosSecciones(): void {
		this.loading.set(true);

		this.asistenciaService
			.getGradosSeccionesDisponibles()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.gradosSecciones().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (grados) => {
					this.allGradosSecciones.set(grados);
					if (this.gradosSecciones().length > 0) {
						this.restoreSelectedGradoSeccion();
						// Cargar datos según el modo actual
						if (this.viewMode() === 'dia') {
							this.loadAsistenciaDia();
						} else {
							this.loadEstudiantes();
						}
						this.loadEstadisticas();
					}
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	selectGradoSeccion(gradoSeccion: GradoSeccion): void {
		const current = this.selectedGradoSeccion();
		if (current?.grado === gradoSeccion.grado && current?.seccion === gradoSeccion.seccion)
			return;

		this.selectedGradoSeccion.set(gradoSeccion);
		this.saveSelectedGradoSeccion();
		// Cargar datos según el modo actual
		if (this.viewMode() === 'dia') {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantes();
		}
	}

	private restoreSelectedGradoSeccion(): void {
		const saved = this.storage.getSelectedGradoSeccionDirector();
		if (saved) {
			const found = this.gradosSecciones().find(
				(gs) => gs.grado === saved.grado && gs.seccion === saved.seccion,
			);
			if (found) {
				this.selectedGradoSeccion.set(found);
				return;
			}
		}
		const first = this.gradosSecciones()[0];
		if (first) {
			this.selectedGradoSeccion.set(first);
		}
	}

	private saveSelectedGradoSeccion(): void {
		const gs = this.selectedGradoSeccion();
		if (gs) {
			this.storage.setSelectedGradoSeccionDirector(gs);
		}
	}

	private reselectGradoSeccionIfNeeded(): void {
		const current = this.selectedGradoSeccion();
		const filtered = this.gradosSecciones();
		if (
			current &&
			filtered.some((gs) => gs.grado === current.grado && gs.seccion === current.seccion)
		) {
			return;
		}
		const first = filtered[0] ?? null;
		this.selectedGradoSeccion.set(first);
		if (first) {
			this.saveSelectedGradoSeccion();
		}
	}

	// === ESTADÍSTICAS ===

	private loadEstadisticas(): void {
		this.asistenciaService
			.getEstadisticasDirector()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estadisticas) => {
					this.estadisticasDia.set(estadisticas);
				},
			});
	}

	// === ESTUDIANTES (MODO MES) ===

	private loadEstudiantes(): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciasGradoDirector(gs.gradoCodigo, gs.seccion, selectedMonth, selectedYear)
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
		const estudianteId = this.storage.getSelectedEstudianteDirectorId();
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
			this.storage.setSelectedEstudianteDirectorId(id);
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

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reselectGradoSeccionIfNeeded();
		this.reloadEstudianteIngresos();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reselectGradoSeccionIfNeeded();
		this.reloadEstudianteSalidas();
	}

	private reloadEstudianteIngresos(): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciasGradoDirector(gs.gradoCodigo, gs.seccion, selectedMonth, selectedYear)
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
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getAsistenciasGradoDirector(gs.gradoCodigo, gs.seccion, selectedMonth, selectedYear)
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

	// === MODO DÍA ===

	setViewMode(mode: ViewMode): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);

		if (mode === 'dia') {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantes();
		}
	}

	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadAsistenciaDia();
	}

	private loadAsistenciaDia(): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);

		this.asistenciaService
			.getAsistenciaDiaDirector(gs.gradoCodigo, gs.seccion, this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantesDia.set(estudiantes);
				},
			});
	}

	selectGradoSeccionDia(gradoSeccion: GradoSeccion): void {
		const current = this.selectedGradoSeccion();
		if (current?.grado === gradoSeccion.grado && current?.seccion === gradoSeccion.seccion)
			return;

		this.selectedGradoSeccion.set(gradoSeccion);
		this.saveSelectedGradoSeccion();
		this.loadAsistenciaDia();
	}

	// === PDF ===

	/**
	 * Ver PDF en nueva ventana
	 * - Abre el PDF en una nueva pestaña para visualización
	 * - El usuario puede navegar por el PDF con los controles del navegador
	 * - Nota: El nombre al descargar desde el visor será un hash (limitación del navegador)
	 */
	verPdfAsistenciaDia(): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(gs.gradoCodigo, gs.seccion, this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					// Crear URL del blob y abrir en nueva pestaña para visualización
					const url = window.URL.createObjectURL(blob);
					window.open(url, '_blank');

					// Cleanup después de que la ventana se abra
					setTimeout(() => window.URL.revokeObjectURL(url), 100);
				},
			});
	}

	/**
	 * Descargar PDF directamente
	 * - Descarga el archivo con el nombre correcto
	 * - No abre nueva ventana, solo descarga
	 */
	descargarPdfAsistenciaDia(): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(gs.gradoCodigo, gs.seccion, this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					// Crear URL del blob
					const url = window.URL.createObjectURL(blob);

					// Crear elemento <a> para forzar descarga con nombre correcto
					const a = document.createElement('a');
					a.href = url;
					const fechaStr = this.fechaDia().toISOString().split('T')[0];
					a.download = `Asistencia_${gs.grado}_${gs.seccion}_${fechaStr}.pdf`;

					// Trigger descarga
					document.body.appendChild(a);
					a.click();

					// Cleanup
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
				},
			});
	}

	// === RELOAD ===

	reload(): void {
		if (this.viewMode() === 'dia') {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantes();
		}
		this.loadEstadisticas();
	}
}
