import { ChangeDetectionStrategy, Component, computed, effect, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { EstudianteAsistencia, AsistenciaDetalle } from '@core/services';
import { getStatusClass } from '@features/intranet/pages/attendance-component/config/attendance.constants';
import {
	getIngresoStatusFromTime,
	getSalidaStatusFromTime,
	hasSalidaTimePassed,
} from '@features/intranet/pages/attendance-component/config/attendance-time.config';
import {
	shouldMarkIngresoAsPending,
	isBeforeRegistrationStart,
	isToday,
} from '@features/intranet/pages/attendance-component/config/attendance.utils';
import { AttendanceStatus } from '@features/intranet/pages/attendance-component/models/attendance.types';

export interface EstudianteAsistenciaDia {
	estudianteId: number;
	nombreCompleto: string;
	dni: string;
	horaEntrada: string | null;
	horaSalida: string | null;
	estadoCodigo: AttendanceStatus;
}

export interface EstadisticasAsistencia {
	total: number;
	temprano: number;
	aTiempo: number;
	fueraHora: number;
	noAsistio: number;
	pendiente: number;
}

@Component({
	selector: 'app-asistencia-dia-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		DatePickerModule,
		CardModule,
		SkeletonModule,
		ButtonModule,
		MenuModule,
		TooltipModule,
	],
	templateUrl: './asistencia-dia-list.component.html',
	styleUrl: './asistencia-dia-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenciaDiaListComponent {
	// Inputs
	readonly estudiantes = input.required<EstudianteAsistencia[]>();
	readonly fecha = input.required<Date>();
	readonly loading = input<boolean>(false);
	readonly showPdfButton = input<boolean>(false);
	readonly downloadingPdf = input<boolean>(false);
	readonly pdfMenuItems = input<MenuItem[]>([]);

	// Outputs
	readonly fechaChange = output<Date>();

	// ViewChild
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	// Constants
	readonly today = new Date();
	readonly skeletonRows = Array(5);

	// State
	fechaValue: Date = new Date();

	// Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	// Computed: estudiantes mapeados con estado calculado
	readonly estudiantesDelDia = computed<EstudianteAsistenciaDia[]>(() =>
		this.estudiantes().map((e) => this.mapEstudianteAsistencia(e)),
	);

	// Computed: estadísticas calculadas en un solo pase
	readonly estadisticas = computed<EstadisticasAsistencia>(() => {
		const estudiantes = this.estudiantesDelDia();
		return estudiantes.reduce(
			(stats, e) => {
				stats.total++;
				switch (e.estadoCodigo) {
					case 'T':
						stats.temprano++;
						break;
					case 'A':
						stats.aTiempo++;
						break;
					case 'F':
						stats.fueraHora++;
						break;
					case 'N':
						stats.noAsistio++;
						break;
					case '-':
					case 'X':
						stats.pendiente++;
						break;
				}
				return stats;
			},
			{ total: 0, temprano: 0, aTiempo: 0, fueraHora: 0, noAsistio: 0, pendiente: 0 },
		);
	});

	constructor() {
		// Sync fechaValue when fecha input changes
		effect(() => {
			this.fechaValue = this.fecha();
		});
	}

	onFechaSelect(fecha: Date): void {
		this.fechaChange.emit(fecha);
	}

	onFechaChange(fecha: Date | null): void {
		if (fecha) {
			this.fechaChange.emit(fecha);
		}
	}

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	formatTime(isoString: string | null): string {
		if (!isoString) return '-';
		// Handle ISO format: "2026-01-26T09:04:35" -> "09:04"
		const match = isoString.match(/T(\d{2}:\d{2})/);
		return match ? match[1] : isoString;
	}

	private mapEstudianteAsistencia(estudiante: EstudianteAsistencia): EstudianteAsistenciaDia {
		const asistencia = estudiante.asistencias[0];
		return {
			estudianteId: estudiante.estudianteId,
			nombreCompleto: estudiante.nombreCompleto,
			dni: estudiante.dni,
			horaEntrada: asistencia?.horaEntrada || null,
			horaSalida: asistencia?.horaSalida || null,
			estadoCodigo: this.calcularEstadoCodigo(asistencia),
		};
	}

	private calcularEstadoCodigo(asistencia: AsistenciaDetalle | undefined): AttendanceStatus {
		const fecha = this.fecha();
		const month = fecha.getMonth() + 1;

		// Si es antes del inicio del registro
		if (isBeforeRegistrationStart(fecha)) {
			return 'X';
		}

		const tieneIngreso = asistencia?.horaEntrada;
		const tieneSalida = asistencia?.horaSalida;

		// CASO 1: Sin hora de ingreso
		if (!tieneIngreso) {
			// CASO 1a: Hay salida sin ingreso → Fuera de hora
			if (tieneSalida) {
				return 'F';
			}

			// CASO 1b: Día actual sin ingreso
			if (isToday(fecha)) {
				// Si ya pasó la hora de salida → No asistió
				if (hasSalidaTimePassed(month)) {
					return 'N';
				}
				// Si aún no pasa la hora de salida → Pendiente
				return '-';
			}

			// CASO 1c: Día pasado sin ingreso → No asistió
			return 'N';
		}

		// CASO 2: Hay hora de ingreso
		const [hourIngresoStr, minuteIngresoStr] =
			asistencia!.horaEntrada!.split('T')[1]?.split(':') || [];
		const hourIngreso = parseInt(hourIngresoStr, 10);
		const minuteIngreso = parseInt(minuteIngresoStr, 10);

		if (isNaN(hourIngreso) || isNaN(minuteIngreso)) {
			return 'N';
		}

		const estadoIngreso = getIngresoStatusFromTime(hourIngreso, minuteIngreso, month);

		// CASO 2a: Hay ingreso pero NO hay salida → Usar estado de ingreso
		if (!tieneSalida) {
			return estadoIngreso;
		}

		// CASO 2b: Hay ingreso Y salida → Tomar el peor estado de ambos
		const [hourSalidaStr, minuteSalidaStr] =
			asistencia!.horaSalida!.split('T')[1]?.split(':') || [];
		const hourSalida = parseInt(hourSalidaStr, 10);
		const minuteSalida = parseInt(minuteSalidaStr, 10);

		if (isNaN(hourSalida) || isNaN(minuteSalida)) {
			return estadoIngreso;
		}

		const estadoSalida = getSalidaStatusFromTime(hourSalida, minuteSalida, month);

		// Peor estado: F > N > T > A
		const estadoPrioridad: Record<AttendanceStatus, number> = {
			F: 4,
			N: 3,
			T: 2,
			A: 1,
			'-': 0,
			X: 0,
		};

		return estadoPrioridad[estadoIngreso] >= estadoPrioridad[estadoSalida]
			? estadoIngreso
			: estadoSalida;
	}
}
