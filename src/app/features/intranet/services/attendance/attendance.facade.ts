import { Injectable, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
	AsistenciaService,
	EstudianteAsistencia,
	EstadisticasDia,
	GradoSeccion,
	HijoApoderado,
	ResumenAsistencia,
	SalonProfesor,
	StorageService,
	UserProfileService,
} from '@core/services';
import { AttendanceDataService } from './attendance-data.service';
import { AttendanceTable } from '../../pages/attendance-component/attendance.types';

export type ViewMode = 'mes' | 'dia';

export interface AttendanceState {
	loading: boolean;
	error: string | null;
	ingresos: AttendanceTable;
	salidas: AttendanceTable;
	resumen: ResumenAsistencia | null;
}

/**
 * Facade para el módulo de asistencias.
 * Simplifica la interacción entre el componente y los múltiples servicios,
 * proporcionando una API unificada para todas las operaciones de asistencia.
 */
@Injectable()
export class AttendanceFacade {
	private asistenciaService = inject(AsistenciaService);
	private userProfile = inject(UserProfileService);
	private storage = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);

	// Estado
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);
	readonly resumen = signal<ResumenAsistencia | null>(null);

	// Tablas de asistencia
	readonly ingresos = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.attendanceDataService.createEmptyTable('Salidas'),
	);

	// Usuario (delegado a UserProfileService)
	readonly userRole = this.userProfile.userRole;
	readonly studentName = this.userProfile.userName;

	// Para apoderado
	readonly hijos = signal<HijoApoderado[]>([]);
	readonly selectedHijoId = signal<number | null>(null);
	readonly selectedHijo = computed(() => {
		const id = this.selectedHijoId();
		return this.hijos().find((h) => h.estudianteId === id) || null;
	});

	// Para profesor
	readonly nombreProfesor = this.userProfile.userName;
	readonly salones = signal<SalonProfesor[]>([]);
	readonly selectedSalonId = signal<number | null>(null);
	readonly selectedSalon = computed(() => {
		const id = this.selectedSalonId();
		return this.salones().find((s) => s.salonId === id) || null;
	});
	readonly estudiantes = signal<EstudianteAsistencia[]>([]);
	readonly selectedEstudianteId = signal<number | null>(null);
	readonly selectedEstudiante = computed(() => {
		const id = this.selectedEstudianteId();
		return this.estudiantes().find((e) => e.estudianteId === id) || null;
	});

	// Modo día/mes para profesor
	readonly viewMode = signal<ViewMode>('mes');
	readonly fechaDia = signal<Date>(new Date());
	readonly estudiantesDia = signal<EstudianteAsistencia[]>([]);

	// Estudiantes como HijoApoderado para reusar el selector
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

	// Para director
	readonly gradosSecciones = signal<GradoSeccion[]>([]);
	readonly selectedGradoSeccion = signal<GradoSeccion | null>(null);
	readonly estadisticasDia = signal<EstadisticasDia | null>(null);
	readonly estudiantesDirector = signal<EstudianteAsistencia[]>([]);
	readonly selectedEstudianteDirectorId = signal<number | null>(null);
	readonly selectedEstudianteDirector = computed(() => {
		const id = this.selectedEstudianteDirectorId();
		return this.estudiantesDirector().find((e) => e.estudianteId === id) || null;
	});
	readonly estudiantesDirectorAsHijos = computed<HijoApoderado[]>(() => {
		return this.estudiantesDirector().map((e) => ({
			estudianteId: e.estudianteId,
			dni: e.dni,
			nombreCompleto: e.nombreCompleto,
			grado: e.grado,
			seccion: e.seccion,
			relacion: 'Estudiante',
		}));
	});
	readonly downloadingPdf = signal(false);

	/**
	 * Inicializa el facade con el usuario actual
	 */
	initialize(destroyRef: DestroyRef): void {
		const role = this.userProfile.userRole();
		if (!role) return;

		this.restoreSelectedMonth();

		if (role === 'Apoderado') {
			this.loadHijos(destroyRef);
		} else if (role === 'Profesor') {
			this.loadSalonesProfesor(destroyRef);
		} else if (role === 'Director') {
			this.loadGradosSeccionesDirector(destroyRef);
		} else {
			this.loadAsistencias(destroyRef);
		}
	}

	// === MÉTODOS DE MES/AÑO ===

	updateSelectedMonth(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
	}

	updateSelectedYear(year: number): void {
		this.ingresos.update((table) => ({ ...table, selectedYear: year }));
		this.salidas.update((table) => ({ ...table, selectedYear: year }));
		this.saveSelectedMonth();
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

	// === ESTUDIANTE ===

	loadAsistencias(destroyRef: DestroyRef): void {
		this.loading.set(true);
		this.error.set(null);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getMisAsistencias(selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response) => {
					if (response) {
						this.resumen.set(response);
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							this.studentName(),
						);
						this.ingresos.set(tables.ingresos);
						this.salidas.set(tables.salidas);
					}
				},
				error: () => {
					this.error.set('Error al cargar asistencias');
				},
			});
	}

	loadIngresosData(destroyRef: DestroyRef): void {
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getMisAsistencias(selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							this.studentName(),
						);
						this.ingresos.set(tables.ingresos);
					}
				},
			});
	}

	loadSalidasData(destroyRef: DestroyRef): void {
		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getMisAsistencias(selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							this.studentName(),
						);
						this.salidas.set(tables.salidas);
					}
				},
			});
	}

	// === APODERADO ===

	private loadHijos(destroyRef: DestroyRef): void {
		this.loading.set(true);
		this.error.set(null);

		this.asistenciaService
			.getHijos()
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => {
					if (this.hijos().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (hijos) => {
					this.hijos.set(hijos);
					if (hijos.length > 0) {
						this.restoreSelectedHijo();
						this.loadHijoAsistencias(destroyRef);
					}
				},
				error: () => {
					this.error.set('Error al cargar hijos');
					this.loading.set(false);
				},
			});
	}

	selectHijo(estudianteId: number, destroyRef: DestroyRef): void {
		if (this.selectedHijoId() === estudianteId) return;

		this.selectedHijoId.set(estudianteId);
		this.saveSelectedHijo();
		this.loadHijoAsistencias(destroyRef);
	}

	private restoreSelectedHijo(): void {
		const hijoId = this.storage.getSelectedHijoId();
		if (hijoId !== null && this.hijos().some((h) => h.estudianteId === hijoId)) {
			this.selectedHijoId.set(hijoId);
			return;
		}
		const firstHijo = this.hijos()[0];
		if (firstHijo) {
			this.selectedHijoId.set(firstHijo.estudianteId);
		}
	}

	private saveSelectedHijo(): void {
		const id = this.selectedHijoId();
		if (id) {
			this.storage.setSelectedHijoId(id);
		}
	}

	loadHijoAsistencias(destroyRef: DestroyRef): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.ingresos.set(tables.ingresos);
						this.salidas.set(tables.salidas);
					} else {
						this.ingresos.set(this.attendanceDataService.createEmptyTable('Ingresos'));
						this.salidas.set(this.attendanceDataService.createEmptyTable('Salidas'));
					}
				},
				error: () => {
					this.error.set('Error al cargar asistencias del hijo');
				},
			});
	}

	loadHijoIngresos(destroyRef: DestroyRef): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.ingresos.set(tables.ingresos);
					}
				},
			});
	}

	loadHijoSalidas(destroyRef: DestroyRef): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getAsistenciaHijo(hijoId, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (response) => {
					if (response) {
						const tables = this.attendanceDataService.processAsistencias(
							response.detalle,
							selectedMonth,
							selectedYear,
							hijo.nombreCompleto,
						);
						this.salidas.set(tables.salidas);
					}
				},
			});
	}

	// === PROFESOR ===

	private loadSalonesProfesor(destroyRef: DestroyRef): void {
		this.loading.set(true);
		this.error.set(null);

		this.asistenciaService
			.getSalonesProfesor()
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => {
					if (this.salones().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (salones) => {
					this.salones.set(salones);
					if (salones.length > 0) {
						this.restoreSelectedSalon();
						this.loadEstudiantesSalon(destroyRef);
					}
				},
				error: () => {
					this.error.set('Error al cargar salones');
					this.loading.set(false);
				},
			});
	}

	selectSalon(salonId: number, destroyRef: DestroyRef): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.loadEstudiantesSalon(destroyRef);
	}

	private restoreSelectedSalon(): void {
		const salonId = this.storage.getSelectedSalonId();
		if (salonId !== null && this.salones().some((s) => s.salonId === salonId)) {
			this.selectedSalonId.set(salonId);
			return;
		}
		const firstSalon = this.salones()[0];
		if (firstSalon) {
			this.selectedSalonId.set(firstSalon.salonId);
		}
	}

	private saveSelectedSalon(): void {
		const id = this.selectedSalonId();
		if (id) {
			this.storage.setSelectedSalonId(id);
		}
	}

	loadEstudiantesSalon(destroyRef: DestroyRef): void {
		const salon = this.selectedSalon();
		if (!salon) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
			.pipe(
				takeUntilDestroyed(destroyRef),
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
					this.error.set('Error al cargar estudiantes');
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
		const estudianteId = this.storage.getSelectedEstudianteId();
		if (
			estudianteId !== null &&
			this.estudiantes().some((e) => e.estudianteId === estudianteId)
		) {
			this.selectedEstudianteId.set(estudianteId);
			return;
		}
		const firstEstudiante = this.estudiantes()[0];
		if (firstEstudiante) {
			this.selectedEstudianteId.set(firstEstudiante.estudianteId);
		}
	}

	private saveSelectedEstudiante(): void {
		const id = this.selectedEstudianteId();
		if (id) {
			this.storage.setSelectedEstudianteId(id);
		}
	}

	private loadEstudianteAsistencias(): void {
		const estudiante = this.selectedEstudiante();
		if (!estudiante) {
			this.loading.set(false);
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
	}

	loadEstudianteIngresos(destroyRef: DestroyRef): void {
		const salon = this.selectedSalon();
		if (!salon) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
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

	loadEstudianteSalidas(destroyRef: DestroyRef): void {
		const salon = this.selectedSalon();
		if (!salon) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
			.pipe(takeUntilDestroyed(destroyRef))
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

	// === PROFESOR: MODO DÍA ===

	setViewMode(mode: ViewMode, destroyRef: DestroyRef): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);

		if (mode === 'dia') {
			this.loadAsistenciaDia(destroyRef);
		} else {
			this.loadEstudiantesSalon(destroyRef);
		}
	}

	setFechaDia(fecha: Date, destroyRef: DestroyRef): void {
		this.fechaDia.set(fecha);
		this.loadAsistenciaDia(destroyRef);
	}

	loadAsistenciaDia(destroyRef: DestroyRef): void {
		const salon = this.selectedSalon();
		if (!salon) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		this.asistenciaService
			.getAsistenciaDia(salon.grado, salon.seccion, this.fechaDia())
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantesDia.set(estudiantes);
				},
				error: () => {
					this.error.set('Error al cargar asistencias del día');
				},
			});
	}

	selectSalonDia(salonId: number, destroyRef: DestroyRef): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.loadAsistenciaDia(destroyRef);
	}

	// === DIRECTOR ===

	private loadGradosSeccionesDirector(destroyRef: DestroyRef): void {
		this.loading.set(true);
		this.error.set(null);

		this.asistenciaService
			.getGradosSeccionesDisponibles()
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => {
					if (this.gradosSecciones().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (grados) => {
					this.gradosSecciones.set(grados);
					if (grados.length > 0) {
						this.restoreSelectedGradoSeccion();
						this.loadEstudiantesDirector(destroyRef);
						this.loadEstadisticasDirector(destroyRef);
					}
				},
				error: () => {
					this.error.set('Error al cargar grados');
					this.loading.set(false);
				},
			});
	}

	selectGradoSeccion(gradoSeccion: GradoSeccion, destroyRef: DestroyRef): void {
		const current = this.selectedGradoSeccion();
		if (current?.grado === gradoSeccion.grado && current?.seccion === gradoSeccion.seccion)
			return;

		this.selectedGradoSeccion.set(gradoSeccion);
		this.saveSelectedGradoSeccion();
		this.loadEstudiantesDirector(destroyRef);
	}

	private restoreSelectedGradoSeccion(): void {
		const saved = this.storage.getSelectedGradoSeccionDirector();
		if (
			saved &&
			this.gradosSecciones().some(
				(gs) => gs.grado === saved.grado && gs.seccion === saved.seccion,
			)
		) {
			this.selectedGradoSeccion.set(saved);
			return;
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

	loadEstudiantesDirector(destroyRef: DestroyRef): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);

		this.asistenciaService
			.getReporteDirector(undefined, gs.grado, gs.seccion)
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => {
					if (this.estudiantesDirector().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantesDirector.set(estudiantes);
					if (estudiantes.length > 0) {
						this.restoreSelectedEstudianteDirector();
						this.loadEstudianteDirectorAsistencias();
					}
				},
				error: () => {
					this.error.set('Error al cargar estudiantes');
					this.loading.set(false);
				},
			});
	}

	selectEstudianteDirector(estudianteId: number): void {
		if (this.selectedEstudianteDirectorId() === estudianteId) return;

		this.selectedEstudianteDirectorId.set(estudianteId);
		this.saveSelectedEstudianteDirector();
		this.loadEstudianteDirectorAsistencias();
	}

	private restoreSelectedEstudianteDirector(): void {
		const estudianteId = this.storage.getSelectedEstudianteDirectorId();
		if (
			estudianteId !== null &&
			this.estudiantesDirector().some((e) => e.estudianteId === estudianteId)
		) {
			this.selectedEstudianteDirectorId.set(estudianteId);
			return;
		}
		const first = this.estudiantesDirector()[0];
		if (first) {
			this.selectedEstudianteDirectorId.set(first.estudianteId);
		}
	}

	private saveSelectedEstudianteDirector(): void {
		const id = this.selectedEstudianteDirectorId();
		if (id) {
			this.storage.setSelectedEstudianteDirectorId(id);
		}
	}

	private loadEstudianteDirectorAsistencias(): void {
		const estudiante = this.selectedEstudianteDirector();
		if (!estudiante) {
			this.loading.set(false);
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
	}

	loadEstadisticasDirector(destroyRef: DestroyRef): void {
		this.asistenciaService
			.getEstadisticasDirector()
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (estadisticas) => {
					this.estadisticasDia.set(estadisticas);
				},
			});
	}

	loadEstudianteDirectorIngresos(destroyRef: DestroyRef): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getReporteDirector(undefined, gs.grado, gs.seccion)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (estudiantes) => {
					this.estudiantesDirector.set(estudiantes);
					const estudiante = estudiantes.find(
						(e) => e.estudianteId === this.selectedEstudianteDirectorId(),
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

	loadEstudianteDirectorSalidas(destroyRef: DestroyRef): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getReporteDirector(undefined, gs.grado, gs.seccion)
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: (estudiantes) => {
					const estudiante = estudiantes.find(
						(e) => e.estudianteId === this.selectedEstudianteDirectorId(),
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

	descargarPdfAsistenciaDia(destroyRef: DestroyRef): void {
		const gs = this.selectedGradoSeccion();
		if (!gs) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(gs.grado, gs.seccion)
			.pipe(
				takeUntilDestroyed(destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					const today = new Date().toISOString().split('T')[0];
					a.download = `Asistencia_${gs.grado}_${gs.seccion}_${today}.pdf`;
					a.click();
					window.URL.revokeObjectURL(url);
				},
				error: () => {
					this.error.set('Error al descargar PDF');
				},
			});
	}

	// === MÉTODOS PÚBLICOS DE RECARGA ===

	reloadCurrentData(destroyRef: DestroyRef): void {
		const role = this.userRole();
		if (role === 'Apoderado') {
			this.loadHijoAsistencias(destroyRef);
		} else if (role === 'Profesor') {
			this.loadEstudiantesSalon(destroyRef);
		} else if (role === 'Director') {
			this.loadEstudiantesDirector(destroyRef);
		} else {
			this.loadAsistencias(destroyRef);
		}
	}

	reloadIngresosData(destroyRef: DestroyRef): void {
		const role = this.userRole();
		if (role === 'Apoderado') {
			this.loadHijoIngresos(destroyRef);
		} else if (role === 'Profesor') {
			this.loadEstudianteIngresos(destroyRef);
		} else if (role === 'Director') {
			this.loadEstudianteDirectorIngresos(destroyRef);
		} else {
			this.loadIngresosData(destroyRef);
		}
	}

	reloadSalidasData(destroyRef: DestroyRef): void {
		const role = this.userRole();
		if (role === 'Apoderado') {
			this.loadHijoSalidas(destroyRef);
		} else if (role === 'Profesor') {
			this.loadEstudianteSalidas(destroyRef);
		} else if (role === 'Director') {
			this.loadEstudianteDirectorSalidas(destroyRef);
		} else {
			this.loadSalidasData(destroyRef);
		}
	}
}
