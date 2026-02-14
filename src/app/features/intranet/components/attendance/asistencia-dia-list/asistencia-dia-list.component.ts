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
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { EstudianteAsistencia, EstadisticasAsistenciaDia } from '@core/services';
import { getStatusClass } from '@features/intranet/pages/attendance-component/config/attendance.constants';
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
		Select,
	],
	templateUrl: './asistencia-dia-list.component.html',
	styleUrl: './asistencia-dia-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenciaDiaListComponent {
	// * Inputs
	readonly estudiantes = input.required<EstudianteAsistencia[]>();
	readonly fecha = input.required<Date>();
	readonly estadisticas = input.required<EstadisticasAsistenciaDia>(); // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ NUEVO: EstadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas desde el backend
	readonly loading = input<boolean>(false);
	readonly showPdfButton = input<boolean>(false);
	readonly downloadingPdf = input<boolean>(false);
	readonly pdfMenuItems = input<MenuItem[]>([]);
	readonly allowJustify = input<boolean>(false);
	readonly savingJustificacion = input<boolean>(false);
	readonly tipoReporteOptions = input<{ label: string; value: string }[]>([]);
	readonly tipoReporte = input<string>('salon');

	// * Outputs
	readonly fechaChange = output<Date>();
	readonly justificar = output<JustificacionEvent>();
	readonly tipoReporteChange = output<string>();

	// * ViewChild
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	// * Constants
	readonly today = new Date();
	readonly skeletonRows = Array(5);
	private readonly PREFIJO_JUSTIFICACION = 'Justificado: ';

	// * Local state for the datepicker model
	fechaValue: Date = new Date();

	// #region Estado del diÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡logo de justificaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
	readonly dialogVisible = signal(false);
	readonly selectedEstudiante = signal<EstudianteAsistenciaDia | null>(null);
	readonly observacionText = signal('');

	// * Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	// * Computed: map raw students to daily status rows
	readonly estudiantesDelDia = computed<EstudianteAsistenciaDia[]>(() =>
		this.estudiantes().map((e) => this.mapEstudianteAsistencia(e)),
	);

	// ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ NUEVO: EstadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas ya no se calculan localmente, vienen del backend como input

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

	// #endregion
	// #region JustificaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n

	/**
	 * Abre el diÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡logo de justificaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n para un estudiante.
	 * Solo se puede justificar si allowJustify estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ habilitado y el estudiante puede ser justificado.
	 */
	onEstudianteClick(estudiante: EstudianteAsistenciaDia): void {
		if (!this.allowJustify() || !estudiante.puedeJustificar) return;

		this.selectedEstudiante.set(estudiante);
		// Si ya estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ justificado, extraer el motivo sin el prefijo "Justificado: "
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

		// Cerrar diÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡logo despuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de emitir - el padre recargarÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ los datos
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

		// Cerrar diÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡logo despuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©s de emitir - el padre recargarÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ los datos
		this.closeDialog();
	}

	/**
	 * Mapea un estudiante con sus asistencias a un registro de asistencia del dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a.
	 * ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ NUEVO: Usa estados calculados desde el backend en lugar de calcularlos localmente.
	 */
	private mapEstudianteAsistencia(estudiante: EstudianteAsistencia): EstudianteAsistenciaDia {
		const asistencia = estudiante.asistencias[0];

		return {
			estudianteId: estudiante.estudianteId,
			nombreCompleto: estudiante.nombreCompleto,
			dni: estudiante.dni,
			horaEntrada: asistencia?.horaEntrada || null,
			horaSalida: asistencia?.horaSalida || null,
			// ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Estados calculados desde el backend
			estadoCodigo: asistencia?.estadoCodigo || 'X',
			observacion: asistencia?.observacion || null,
			puedeJustificar: asistencia?.puedeJustificar ?? true,
			esJustificado: asistencia?.esJustificado ?? false,
		};
	}
	// #endregion
}
