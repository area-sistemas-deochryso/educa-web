import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { EstudianteAsistencia, AsistenciaDetalle } from '@core/services';
import { getStatusClass } from '@features/intranet/pages/attendance-component/config/attendance.constants';
import { getIngresoStatusFromTime } from '@features/intranet/pages/attendance-component/config/attendance-time.config';
import {
	shouldMarkIngresoAsPending,
	isBeforeRegistrationStart,
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

	// Outputs
	readonly fechaChange = output<Date>();

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

		// Si es pendiente (futuro o hoy sin pasar hora límite)
		if (shouldMarkIngresoAsPending(fecha, month)) {
			return '-';
		}

		// Sin asistencia o sin hora de entrada = No asistió
		if (!asistencia || !asistencia.horaEntrada) {
			return 'N';
		}

		// Calcular estado basado en hora de entrada
		const [hourStr, minuteStr] = asistencia.horaEntrada.split('T')[1]?.split(':') || [];
		const hour = parseInt(hourStr, 10);
		const minute = parseInt(minuteStr, 10);

		if (isNaN(hour) || isNaN(minute)) {
			return 'N';
		}

		return getIngresoStatusFromTime(hour, minute, month);
	}
}
