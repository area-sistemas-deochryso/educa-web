import { VoiceRecognitionService } from '@core/services';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';

import { AttendanceFacade } from './services/attendance.facade';
import { AttendanceHeaderComponent } from './components/attendance-header/attendance-header.component';
import { AttendanceLegendComponent } from './components/attendance-legend/attendance-legend.component';
import { AttendanceTableComponent } from './components/attendance-table/attendance-table.component';
import { SalonSelectorComponent } from './components/salon-selector/salon-selector.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-attendance',
	imports: [
		CommonModule,
		AttendanceHeaderComponent,
		AttendanceLegendComponent,
		AttendanceTableComponent,
		SalonSelectorComponent,
		EmptyStateComponent,
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

	reloadAll(): void {
		this.facade.reloadCurrentData(this.destroyRef);
	}
}
