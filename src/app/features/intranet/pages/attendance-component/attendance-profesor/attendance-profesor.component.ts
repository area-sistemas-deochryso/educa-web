import {
	AsistenciaService,
	EstudianteAsistencia,
	HijoApoderado,
	SalonProfesor,
	StorageService,
	UserProfileService,
} from '@core/services';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { AsistenciaDiaListComponent } from '../../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';
import { AttendanceDataService } from '../../../services/attendance/attendance-data.service';
import { AttendanceLegendComponent } from '@app/features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTable } from '../models/attendance.types';
import { AttendanceTableComponent } from '../../../components/attendance/attendance-table/attendance-table.component';
import { EmptyStateComponent } from '../../../components/attendance/empty-state/empty-state.component';
import { SalonSelectorComponent } from '../../../components/attendance/salon-selector/salon-selector.component';
import { ViewMode } from '../../../components/attendance/attendance-header/attendance-header.component';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Componente Container para vista de asistencias de Profesores.
 * Maneja salones, estudiantes y modo día/mes.
 */
@Component({
	selector: 'app-attendance-profesor',
	standalone: true,
	imports: [
		AttendanceTableComponent,
		SalonSelectorComponent,
		AsistenciaDiaListComponent,
		EmptyStateComponent,
		AttendanceLegendComponent,
	],
	templateUrl: './attendance-profesor.component.html',
})
export class AttendanceProfesorComponent implements OnInit {
	private asistenciaService = inject(AsistenciaService);
	private storage = inject(StorageService);
	private attendanceDataService = inject(AttendanceDataService);
	private userProfile = inject(UserProfileService);
	private destroyRef = inject(DestroyRef);

	// Estado
	readonly loading = signal(false);
	readonly nombreProfesor = this.userProfile.userName;

	// Salones
	private readonly allSalones = signal<SalonProfesor[]>([]);
	readonly salones = computed(() => {
		const all = this.allSalones();
		const month = this.ingresos().selectedMonth;
		const isVerano = month === 1 || month === 2;
		return all.filter((s) =>
			isVerano
				? s.seccion.toUpperCase() === 'V'
				: s.seccion.toUpperCase() !== 'V',
		);
	});
	readonly selectedSalonId = signal<number | null>(null);
	readonly selectedSalon = computed(() => {
		const id = this.selectedSalonId();
		return this.salones().find((s) => s.salonId === id) || null;
	});

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
	readonly viewMode = signal<ViewMode>('mes');
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
		this.loadSalones();
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

	// === SALONES ===

	private loadSalones(): void {
		this.loading.set(true);

		this.asistenciaService
			.getSalonesProfesor()
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => {
					if (this.salones().length === 0) {
						this.loading.set(false);
					}
				}),
			)
			.subscribe({
				next: (salones) => {
					this.allSalones.set(salones);
					if (this.salones().length > 0) {
						this.restoreSelectedSalon();
						this.loadEstudiantesSalon();
					}
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	selectSalon(salonId: number): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.loadEstudiantesSalon();
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

	private reselectSalonIfNeeded(): void {
		const currentId = this.selectedSalonId();
		const filtered = this.salones();
		if (currentId && filtered.some((s) => s.salonId === currentId)) {
			return;
		}
		const first = filtered[0] ?? null;
		this.selectedSalonId.set(first?.salonId ?? null);
		if (first) {
			this.saveSelectedSalon();
		}
	}

	// === ESTUDIANTES (MODO MES) ===

	private loadEstudiantesSalon(): void {
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

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reselectSalonIfNeeded();
		this.reloadEstudianteIngresos();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.saveSelectedMonth();
		this.reselectSalonIfNeeded();
		this.reloadEstudianteSalidas();
	}

	private reloadEstudianteIngresos(): void {
		const salon = this.selectedSalon();
		if (!salon) return;

		const { selectedMonth, selectedYear } = this.ingresos();

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
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
		const salon = this.selectedSalon();
		if (!salon) return;

		const { selectedMonth, selectedYear } = this.salidas();

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
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
			this.loadEstudiantesSalon();
		}
	}

	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadAsistenciaDia();
	}

	private loadAsistenciaDia(): void {
		const salon = this.selectedSalon();
		if (!salon) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);

		this.asistenciaService
			.getAsistenciaDia(salon.grado, salon.seccion, this.fechaDia())
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

	selectSalonDia(salonId: number): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.loadAsistenciaDia();
	}

	// === RELOAD ===

	reload(): void {
		if (this.viewMode() === 'dia') {
			this.loadAsistenciaDia();
		} else {
			this.loadEstudiantesSalon();
		}
	}
}
