import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
	ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { MenuItem } from 'primeng/api';
import { EstudianteAsistencia, AsistenciaDetalle } from '@core/services';
import { getStatusClass } from '@features/intranet/pages/attendance-component/config/attendance.constants';
import {
	getIngresoStatusFromTime,
	getSalidaStatusFromTime,
	hasSalidaTimePassed,
} from '@features/intranet/pages/attendance-component/config/attendance-time.config';
import {
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
	observacion: string | null;
	puedeJustificar: boolean;
	esJustificado: boolean;
}

export interface EstadisticasAsistencia {
	total: number;
	temprano: number;
	aTiempo: number;
	fueraHora: number;
	noAsistio: number;
	justificado: number;
	pendiente: number;
}

export interface JustificacionEvent {
	estudianteId: number;
	observacion: string;
	quitar: boolean;
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
		DialogModule,
		Textarea,
	],
	templateUrl: './asistencia-dia-list.component.html',
	styleUrl: './asistencia-dia-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenciaDiaListComponent {
	// * Inputs
	readonly estudiantes = input.required<EstudianteAsistencia[]>();
	readonly fecha = input.required<Date>();
	readonly loading = input<boolean>(false);
	readonly showPdfButton = input<boolean>(false);
	readonly downloadingPdf = input<boolean>(false);
	readonly pdfMenuItems = input<MenuItem[]>([]);
	readonly allowJustify = input<boolean>(false);
	readonly savingJustificacion = input<boolean>(false);

	// * Outputs
	readonly fechaChange = output<Date>();
	readonly justificar = output<JustificacionEvent>();

	// * ViewChild
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	// * Constants
	readonly today = new Date();
	readonly skeletonRows = Array(5);
	private readonly PREFIJO_JUSTIFICACION = 'Justificado: ';

	// * Local state for the datepicker model
	fechaValue: Date = new Date();

	// ============ Estado del diálogo de justificación ============
	readonly dialogVisible = signal(false);
	readonly selectedEstudiante = signal<EstudianteAsistenciaDia | null>(null);
	readonly observacionText = signal('');

	// * Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	// * Computed: map raw students to daily status rows
	readonly estudiantesDelDia = computed<EstudianteAsistenciaDia[]>(() =>
		this.estudiantes().map((e) => this.mapEstudianteAsistencia(e)),
	);

	// * Computed: stats in a single pass for footer badges
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
					case 'J':
						stats.justificado++;
						break;
					case '-':
					case 'X':
						stats.pendiente++;
						break;
				}
				return stats;
			},
			{ total: 0, temprano: 0, aTiempo: 0, fueraHora: 0, noAsistio: 0, justificado: 0, pendiente: 0 },
		);
	});

	constructor() {
		// * Sync datepicker model when input changes (OnPush friendly).
		effect(() => {
			this.fechaValue = this.fecha();
		});
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
		// * Handle ISO format: "2026-01-26T09:04:35" -> "09:04"
		const match = isoString.match(/T(\d{2}:\d{2})/);
		return match ? match[1] : isoString;
	}

	// ============ Justificación ============

	/**
	 * Abre el diálogo de justificación para un estudiante.
	 * Solo se puede justificar si allowJustify está habilitado y el estudiante puede ser justificado.
	 */
	onEstudianteClick(estudiante: EstudianteAsistenciaDia): void {
		if (!this.allowJustify() || !estudiante.puedeJustificar) return;

		this.selectedEstudiante.set(estudiante);
		// Si ya está justificado, extraer el motivo sin el prefijo "Justificado: "
		const observacion = estudiante.observacion || '';
		const sinPrefijo = observacion.startsWith(this.PREFIJO_JUSTIFICACION)
			? observacion.replace(this.PREFIJO_JUSTIFICACION, '')
			: observacion;
		this.observacionText.set(sinPrefijo);
		this.dialogVisible.set(true);
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.closeDialog();
		}
	}

	closeDialog(): void {
		this.dialogVisible.set(false);
		this.selectedEstudiante.set(null);
		this.observacionText.set('');
	}

	guardarJustificacion(): void {
		const estudiante = this.selectedEstudiante();
		const observacion = this.observacionText().trim();

		if (!estudiante || !observacion) return;

		this.justificar.emit({
			estudianteId: estudiante.estudianteId,
			observacion,
			quitar: false,
		});

		// Cerrar diálogo después de emitir - el padre recargará los datos
		this.closeDialog();
	}

	quitarJustificacion(): void {
		const estudiante = this.selectedEstudiante();
		if (!estudiante) return;

		this.justificar.emit({
			estudianteId: estudiante.estudianteId,
			observacion: '',
			quitar: true,
		});

		// Cerrar diálogo después de emitir - el padre recargará los datos
		this.closeDialog();
	}

	private mapEstudianteAsistencia(estudiante: EstudianteAsistencia): EstudianteAsistenciaDia {
		const asistencia = estudiante.asistencias[0];
		const observacion = asistencia?.observacion || null;
		const estadoBase = this.calcularEstadoBase(asistencia);

		// Si no hay asistencia o es incompleta, y tiene observación con "Justificado:" → Justificado
		const esJustificado = this.esJustificado(asistencia, observacion);
		const estadoCodigo = esJustificado ? 'J' : estadoBase;

		// Puede justificar si: sin asistencia O estado incompleta O ya justificado (para poder quitar)
		const puedeJustificar = !asistencia || asistencia.estado === 'Incompleta' || esJustificado;

		return {
			estudianteId: estudiante.estudianteId,
			nombreCompleto: estudiante.nombreCompleto,
			dni: estudiante.dni,
			horaEntrada: asistencia?.horaEntrada || null,
			horaSalida: asistencia?.horaSalida || null,
			estadoCodigo,
			observacion,
			puedeJustificar,
			esJustificado,
		};
	}

	/**
	 * Determina si una asistencia debe marcarse como Justificada.
	 * Es justificado cuando: (sin asistencia O incompleta) Y tiene observación que inicia con "Justificado:".
	 */
	private esJustificado(
		asistencia: AsistenciaDetalle | undefined,
		observacion: string | null,
	): boolean {
		if (!observacion || !observacion.trim().startsWith(this.PREFIJO_JUSTIFICACION)) return false;

		// Sin asistencia con observación de justificación → justificado
		if (!asistencia) return true;

		// Asistencia incompleta con observación de justificación → justificado
		if (asistencia.estado === 'Incompleta') return true;

		return false;
	}

	private calcularEstadoBase(asistencia: AsistenciaDetalle | undefined): AttendanceStatus {
		const fecha = this.fecha();
		const month = fecha.getMonth() + 1;

		// ! Before registration start, mark as "X" and skip other rules.
		if (isBeforeRegistrationStart(fecha)) {
			return 'X';
		}

		const tieneIngreso = asistencia?.horaEntrada;
		const tieneSalida = asistencia?.horaSalida;

		// * CASE 1: no entry time
		if (!tieneIngreso) {
			// * CASE 1a: exit without entry -> out of schedule
			if (tieneSalida) {
				return 'F';
			}

			// * CASE 1b: today without entry
			if (isToday(fecha)) {
				// * After exit time -> absent
				if (hasSalidaTimePassed(month)) {
					return 'N';
				}
				// * Before exit time -> pending
				return '-';
			}

			// * CASE 1c: past day without entry -> absent
			return 'N';
		}

		// * CASE 2: has entry time
		const [hourIngresoStr, minuteIngresoStr] =
			asistencia!.horaEntrada!.split('T')[1]?.split(':') || [];
		const hourIngreso = parseInt(hourIngresoStr, 10);
		const minuteIngreso = parseInt(minuteIngresoStr, 10);

		if (isNaN(hourIngreso) || isNaN(minuteIngreso)) {
			return 'N';
		}

		const estadoIngreso = getIngresoStatusFromTime(hourIngreso, minuteIngreso, month);

		// * CASE 2a: entry without exit -> use entry status
		if (!tieneSalida) {
			return estadoIngreso;
		}

		// * CASE 2b: entry + exit -> take worse status
		const [hourSalidaStr, minuteSalidaStr] =
			asistencia!.horaSalida!.split('T')[1]?.split(':') || [];
		const hourSalida = parseInt(hourSalidaStr, 10);
		const minuteSalida = parseInt(minuteSalidaStr, 10);

		if (isNaN(hourSalida) || isNaN(minuteSalida)) {
			return estadoIngreso;
		}

		const estadoSalida = getSalidaStatusFromTime(hourSalida, minuteSalida, month);

		// * Priority: F > N > J > T > A
		const estadoPrioridad: Record<AttendanceStatus, number> = {
			F: 5,
			N: 4,
			J: 3,
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
