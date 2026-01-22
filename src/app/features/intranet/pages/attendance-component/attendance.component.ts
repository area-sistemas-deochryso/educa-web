import {
	AsistenciaService,
	EstudianteAsistencia,
	HijoApoderado,
	ResumenAsistencia,
	SalonProfesor,
	VoiceRecognitionService,
	StorageService,
} from '@core/services';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { AttendanceDataService } from './services/attendance-data.service';
import { AttendanceHeaderComponent } from './components/attendance-header/attendance-header.component';
import { AttendanceLegendComponent } from './components/attendance-legend/attendance-legend.component';
import { AttendanceTable } from './attendance.types';
import { AttendanceTableComponent } from './components/attendance-table/attendance-table.component';
import { AuthService } from '@core/services';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-attendance',
	imports: [
		CommonModule,
		AttendanceHeaderComponent,
		AttendanceLegendComponent,
		AttendanceTableComponent,
	],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent implements OnInit, OnDestroy {
	private asistenciaService = inject(AsistenciaService);
	private authService = inject(AuthService);
	private voiceService = inject(VoiceRecognitionService);
	private attendanceDataService = inject(AttendanceDataService);
	private storage = inject(StorageService);
	private voiceUnsubscribe: (() => void) | null = null;

	userRole: string = '';
	studentName = '';
	loading = signal(false);
	resumen: ResumenAsistencia | null = null;

	// Para estudiante (vista simple)
	ingresos = signal<AttendanceTable>(this.attendanceDataService.createEmptyTable('Ingresos'));
	salidas = signal<AttendanceTable>(this.attendanceDataService.createEmptyTable('Salidas'));

	// Para apoderado (selección de hijo)
	hijos = signal<HijoApoderado[]>([]);
	selectedHijoId = signal<number | null>(null);

	// Para profesor (salones + selección de estudiante)
	nombreProfesor: string | null = this.storage.getUser()?.nombreCompleto ?? null;

	salones = signal<SalonProfesor[]>([]);
	selectedSalonId = signal<number | null>(null);
	estudiantes = signal<EstudianteAsistencia[]>([]);
	selectedEstudianteId = signal<number | null>(null);

	// Hijo seleccionado computado (Apoderado)
	selectedHijo = computed(() => {
		const id = this.selectedHijoId();
		return this.hijos().find((h) => h.estudianteId === id) || null;
	});

	// Estudiante seleccionado computado (Profesor)
	selectedEstudiante = computed(() => {
		const id = this.selectedEstudianteId();
		return this.estudiantes().find((e) => e.estudianteId === id) || null;
	});

	// Estudiantes como HijoApoderado para reusar el selector
	estudiantesAsHijos = computed<HijoApoderado[]>(() => {
		return this.estudiantes().map((e) => ({
			estudianteId: e.estudianteId,
			dni: e.dni,
			nombreCompleto: e.nombreCompleto,
			grado: e.grado,
			seccion: e.seccion,
			relacion: 'Estudiante',
		}));
	});

	ngOnInit(): void {
		const user = this.authService.currentUser;
		if (user) {
			this.userRole = user.rol;
			this.studentName = user.nombreCompleto;
			this.restoreSelectedMonth();

			if (this.userRole === 'Apoderado') {
				this.loadHijos();
			} else if (this.userRole === 'Profesor') {
				this.loadSalonesProfesor();
			} else {
				this.loadAsistencias();
			}
		}
		this.setupVoiceCommands();
	}

	ngOnDestroy(): void {
		if (this.voiceUnsubscribe) {
			this.voiceUnsubscribe();
		}
	}

	private setupVoiceCommands(): void {
		this.voiceUnsubscribe = this.voiceService.onCommand((command, params) => {
			if (command === 'change-month' && params) {
				const month = parseInt(params, 10);
				if (month >= 1 && month <= 12) {
					this.updateSelectedMonth(month);
					this.saveSelectedMonth();
					this.reloadCurrentData();
				}
			} else if (command === 'change-year' && params) {
				const year = parseInt(params, 10);
				if (year >= 2000 && year <= 2100) {
					this.updateSelectedYear(year);
					this.saveSelectedMonth();
					this.reloadCurrentData();
				}
			}
		});
	}

	private updateSelectedMonth(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
	}

	private updateSelectedYear(year: number): void {
		this.ingresos.update((table) => ({ ...table, selectedYear: year }));
		this.salidas.update((table) => ({ ...table, selectedYear: year }));
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

	// === ESTUDIANTE ===
	loadAsistencias(): void {
		this.loading.set(true);
		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		this.asistenciaService.getMisAsistencias(selectedMonth, selectedYear).subscribe({
			next: (response) => {
				if (response) {
					this.resumen = response;
					const tables = this.attendanceDataService.processAsistencias(
						response.detalle,
						selectedMonth,
						selectedYear,
						this.studentName,
					);
					this.ingresos.set(tables.ingresos);
					this.salidas.set(tables.salidas);
				}
				this.loading.set(false);
			},
			error: () => {
				this.loading.set(false);
			},
		});
	}

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.reloadIngresosData();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.reloadSalidasData();
	}

	private loadIngresosData(): void {
		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		this.asistenciaService.getMisAsistencias(selectedMonth, selectedYear).subscribe({
			next: (response) => {
				if (response) {
					const tables = this.attendanceDataService.processAsistencias(
						response.detalle,
						selectedMonth,
						selectedYear,
						this.studentName,
					);
					this.ingresos.set(tables.ingresos);
				}
			},
		});
	}

	private loadSalidasData(): void {
		const selectedMonth = this.salidas().selectedMonth;
		const selectedYear = this.salidas().selectedYear;

		this.asistenciaService.getMisAsistencias(selectedMonth, selectedYear).subscribe({
			next: (response) => {
				if (response) {
					const tables = this.attendanceDataService.processAsistencias(
						response.detalle,
						selectedMonth,
						selectedYear,
						this.studentName,
					);
					this.salidas.set(tables.salidas);
				}
			},
		});
	}

	// === APODERADO ===
	private loadHijos(): void {
		this.loading.set(true);

		this.asistenciaService.getHijos().subscribe({
			next: (hijos) => {
				this.hijos.set(hijos);
				if (hijos.length > 0) {
					this.restoreSelectedHijo();
					this.loadHijoAsistencias();
				} else {
					this.loading.set(false);
				}
			},
			error: () => {
				this.loading.set(false);
			},
		});
	}

	selectHijo(estudianteId: number): void {
		if (this.selectedHijoId() === estudianteId) return;

		this.selectedHijoId.set(estudianteId);
		this.saveSelectedHijo();
		this.loadHijoAsistencias();
	}

	private loadHijoAsistencias(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		this.asistenciaService.getAsistenciaHijo(hijoId, selectedMonth, selectedYear).subscribe({
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
				this.loading.set(false);
			},
			error: () => {
				this.loading.set(false);
			},
		});
	}

	private loadHijoIngresos(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		this.asistenciaService.getAsistenciaHijo(hijoId, selectedMonth, selectedYear).subscribe({
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

	private loadHijoSalidas(): void {
		const hijoId = this.selectedHijoId();
		const hijo = this.selectedHijo();
		if (!hijoId || !hijo) return;

		const selectedMonth = this.salidas().selectedMonth;
		const selectedYear = this.salidas().selectedYear;

		this.asistenciaService.getAsistenciaHijo(hijoId, selectedMonth, selectedYear).subscribe({
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
	private loadSalonesProfesor(): void {
		this.loading.set(true);

		this.asistenciaService.getSalonesProfesor().subscribe({
			next: (salones) => {
				this.salones.set(salones);
				if (salones.length > 0) {
					this.restoreSelectedSalon();
					this.loadEstudiantesSalon();
				} else {
					this.loading.set(false);
				}
			},
			error: () => {
				this.loading.set(false);
			},
		});
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

	// Salón seleccionado computado
	get selectedSalon(): SalonProfesor | null {
		const id = this.selectedSalonId();
		return this.salones().find((s) => s.salonId === id) || null;
	}

	selectSalon(salonId: number): void {
		if (this.selectedSalonId() === salonId) return;

		this.selectedSalonId.set(salonId);
		this.saveSelectedSalon();
		this.loadEstudiantesSalon();
	}

	private loadEstudiantesSalon(): void {
		const salon = this.selectedSalon;
		if (!salon) {
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		// Cargar asistencias del grado/sección del salón seleccionado
		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
			.subscribe({
				next: (estudiantes) => {
					this.estudiantes.set(estudiantes);
					if (estudiantes.length > 0) {
						this.restoreSelectedEstudiante();
						this.loadEstudianteAsistencias();
					} else {
						this.loading.set(false);
					}
				},
				error: () => {
					this.loading.set(false);
				},
			});
	}

	private restoreSelectedEstudiante(): void {
		const estudianteId = this.storage.getSelectedEstudianteId();
		if (estudianteId !== null && this.estudiantes().some((e) => e.estudianteId === estudianteId)) {
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

	selectEstudiante(estudianteId: number): void {
		if (this.selectedEstudianteId() === estudianteId) return;

		this.selectedEstudianteId.set(estudianteId);
		this.saveSelectedEstudiante();
		this.loadEstudianteAsistencias();
	}

	private loadEstudianteAsistencias(): void {
		const estudiante = this.selectedEstudiante();
		if (!estudiante) {
			this.loading.set(false);
			return;
		}

		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		// Las asistencias ya vienen en el objeto estudiante desde el endpoint
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

	private loadEstudianteIngresos(): void {
		const salon = this.selectedSalon;
		if (!salon) return;

		const selectedMonth = this.ingresos().selectedMonth;
		const selectedYear = this.ingresos().selectedYear;

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
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

	private loadEstudianteSalidas(): void {
		const salon = this.selectedSalon;
		if (!salon) return;

		const selectedMonth = this.salidas().selectedMonth;
		const selectedYear = this.salidas().selectedYear;

		this.asistenciaService
			.getAsistenciasGrado(salon.grado, salon.seccion, selectedMonth, selectedYear)
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

	private reloadCurrentData(): void {
		if (this.userRole === 'Apoderado') {
			this.loadHijoAsistencias();
		} else if (this.userRole === 'Profesor') {
			this.loadEstudiantesSalon();
		} else {
			this.loadAsistencias();
		}
	}

	private reloadIngresosData(): void {
		if (this.userRole === 'Apoderado') {
			this.loadHijoIngresos();
		} else if (this.userRole === 'Profesor') {
			this.loadEstudianteIngresos();
		} else {
			this.loadIngresosData();
		}
	}

	private reloadSalidasData(): void {
		if (this.userRole === 'Apoderado') {
			this.loadHijoSalidas();
		} else if (this.userRole === 'Profesor') {
			this.loadEstudianteSalidas();
		} else {
			this.loadSalidasData();
		}
	}

	reloadAll(): void {
		this.reloadCurrentData();
	}
}
