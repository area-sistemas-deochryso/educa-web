import { VoiceRecognitionService } from '@core/services';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';

import { GradoSeccion } from '@core/services';
import { AttendanceFacade } from '../../services/attendance/attendance.facade';
import {
	AttendanceHeaderComponent,
	ViewMode,
} from '../../components/attendance/attendance-header/attendance-header.component';
import { AttendanceLegendComponent } from '../../components/attendance/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from '../../components/attendance/attendance-table/attendance-table.component';
import { SalonSelectorComponent } from '../../components/attendance/salon-selector/salon-selector.component';
import { EmptyStateComponent } from '../../components/attendance/empty-state/empty-state.component';
import { GradoSeccionSelectorComponent } from '../../components/attendance/grado-seccion-selector/grado-seccion-selector.component';
import { EstadisticasDiaComponent } from '../../components/attendance/estadisticas-dia/estadisticas-dia.component';
import { AsistenciaDiaListComponent } from '../../components/attendance/asistencia-dia-list/asistencia-dia-list.component';

@Component({
	selector: 'app-attendance',
	imports: [
		AttendanceHeaderComponent,
		AttendanceLegendComponent,
		AttendanceTableComponent,
		SalonSelectorComponent,
		EmptyStateComponent,
		GradoSeccionSelectorComponent,
		EstadisticasDiaComponent,
		AsistenciaDiaListComponent,
	],
	providers: [AttendanceFacade],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent implements OnInit, OnDestroy {
	private voiceService = inject(VoiceRecognitionService);
	private destroyRef = inject(DestroyRef);
	private voiceUnsubscribe: (() => void) | null = null;

	// Facade expone todo el estado y la lógica
	readonly facade = inject(AttendanceFacade);

	// Aliases para el template (mantener compatibilidad)
	get userRole() {
		return this.facade.userRole();
	}
	get studentName() {
		return this.facade.studentName();
	}
	get loading() {
		return this.facade.loading;
	}
	get resumen() {
		return this.facade.resumen();
	}
	get ingresos() {
		return this.facade.ingresos;
	}
	get salidas() {
		return this.facade.salidas;
	}
	get hijos() {
		return this.facade.hijos;
	}
	get selectedHijoId() {
		return this.facade.selectedHijoId;
	}
	get selectedHijo() {
		return this.facade.selectedHijo;
	}
	get nombreProfesor() {
		return this.facade.nombreProfesor();
	}
	get salones() {
		return this.facade.salones;
	}
	get selectedSalonId() {
		return this.facade.selectedSalonId;
	}
	get selectedSalon() {
		return this.facade.selectedSalon();
	}
	get estudiantes() {
		return this.facade.estudiantes;
	}
	get selectedEstudianteId() {
		return this.facade.selectedEstudianteId;
	}
	get selectedEstudiante() {
		return this.facade.selectedEstudiante;
	}
	get estudiantesAsHijos() {
		return this.facade.estudiantesAsHijos;
	}

	// Modo día/mes para profesor
	get viewMode() {
		return this.facade.viewMode;
	}
	get fechaDia() {
		return this.facade.fechaDia;
	}
	get estudiantesDia() {
		return this.facade.estudiantesDia;
	}

	// Para director
	get gradosSecciones() {
		return this.facade.gradosSecciones;
	}
	get selectedGradoSeccion() {
		return this.facade.selectedGradoSeccion;
	}
	get estadisticasDia() {
		return this.facade.estadisticasDia;
	}
	get estudiantesDirector() {
		return this.facade.estudiantesDirector;
	}
	get selectedEstudianteDirectorId() {
		return this.facade.selectedEstudianteDirectorId;
	}
	get estudiantesDirectorAsHijos() {
		return this.facade.estudiantesDirectorAsHijos;
	}
	get downloadingPdf() {
		return this.facade.downloadingPdf;
	}

	ngOnInit(): void {
		this.facade.initialize(this.destroyRef);
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
					this.facade.updateSelectedMonth(month);
					this.facade.reloadCurrentData(this.destroyRef);
				}
			} else if (command === 'change-year' && params) {
				const year = parseInt(params, 10);
				if (year >= 2000 && year <= 2100) {
					this.facade.updateSelectedYear(year);
					this.facade.reloadCurrentData(this.destroyRef);
				}
			}
		});
	}

	// === MÉTODOS DELEGADOS AL FACADE ===

	onIngresosMonthChange(month: number): void {
		this.facade.ingresos.update((table) => ({ ...table, selectedMonth: month }));
		this.facade.reloadIngresosData(this.destroyRef);
	}

	onSalidasMonthChange(month: number): void {
		this.facade.salidas.update((table) => ({ ...table, selectedMonth: month }));
		this.facade.reloadSalidasData(this.destroyRef);
	}

	selectHijo(estudianteId: number): void {
		this.facade.selectHijo(estudianteId, this.destroyRef);
	}

	selectSalon(salonId: number): void {
		this.facade.selectSalon(salonId, this.destroyRef);
	}

	selectEstudiante(estudianteId: number): void {
		this.facade.selectEstudiante(estudianteId);
	}

	// Modo día/mes
	onViewModeChange(mode: ViewMode): void {
		this.facade.setViewMode(mode, this.destroyRef);
	}

	onFechaDiaChange(fecha: Date): void {
		this.facade.setFechaDia(fecha, this.destroyRef);
	}

	selectSalonDia(salonId: number): void {
		this.facade.selectSalonDia(salonId, this.destroyRef);
	}

	// Director
	selectGradoSeccion(gs: GradoSeccion): void {
		this.facade.selectGradoSeccion(gs, this.destroyRef);
	}

	selectEstudianteDirector(estudianteId: number): void {
		this.facade.selectEstudianteDirector(estudianteId);
	}

	descargarPdfAsistenciaDia(): void {
		this.facade.descargarPdfAsistenciaDia(this.destroyRef);
	}

	reloadAll(): void {
		this.facade.reloadCurrentData(this.destroyRef);
	}
}
