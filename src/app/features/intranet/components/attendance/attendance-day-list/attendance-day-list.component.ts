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
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { EstudianteAsistencia, EstadisticasAsistenciaDia } from '@data/models';
import { ResponsiveTableComponent, TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { FormatTimePipe } from '@intranet-shared/pipes';
import { getStatusClass } from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { AttendanceStatus } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { InputTextModule } from 'primeng/inputtext';
import { AttendanceTemporalNavComponent } from '../attendance-temporal-nav/attendance-temporal-nav.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

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
	selector: 'app-attendance-day-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		SkeletonModule,
		SkeletonLoaderComponent,
		TableSkeletonComponent,
		ResponsiveTableComponent,
		ButtonModule,
		MenuModule,
		TooltipModule,
		DialogModule,
		Textarea,
		Select,
		FormatTimePipe,
		InputTextModule,
		AttendanceTemporalNavComponent,
		EmptyStateComponent,
	],
	templateUrl: './attendance-day-list.component.html',
	styleUrl: './attendance-day-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDayListComponent {
	// * Inputs
	readonly estudiantes = input.required<EstudianteAsistencia[]>();
	readonly fecha = input.required<Date>();
	readonly estadisticas = input.required<EstadisticasAsistenciaDia>();
	readonly loading = input<boolean>(false);
	readonly showPdfButton = input<boolean>(false);
	readonly downloadingPdf = input<boolean>(false);
	readonly pdfMenuItems = input<MenuItem[]>([]);
	readonly allowJustify = input<boolean>(false);
	readonly savingJustificacion = input<boolean>(false);
	readonly tipoReporteOptions = input<{ label: string; items: { label: string; value: string }[] }[]>([]);
	readonly tipoReporte = input<string>('salon');
	readonly activeStatus = input<AttendanceStatus | null>(null);
	readonly hideTemporalNav = input(false);

	// * Outputs
	readonly fechaChange = output<Date>();
	readonly justificar = output<JustificacionEvent>();
	readonly tipoReporteChange = output<string>();

	// * ViewChild
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	// * Constants
	readonly today = new Date();
	readonly skeletonBadges = Array(7);
	readonly diaColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '100px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '80px', cellType: 'badge' },
	];
	private readonly PREFIJO_JUSTIFICACION = 'Justificado: ';

	// * Local state for the datepicker model (signal for OnPush reactivity)
	readonly fechaValue = signal<Date>(new Date());
	readonly searchTerm = signal('');

	// #region Estado del diálogo de justificación
	readonly dialogVisible = signal(false);
	readonly selectedEstudiante = signal<EstudianteAsistenciaDia | null>(null);
	readonly observacionText = signal('');

	// * Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	readonly isToday = computed(() => {
		const f = this.fecha();
		const t = this.today;
		return f.getDate() === t.getDate() && f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
	});

	// * Computed: map raw students to daily status rows
	readonly estudiantesDelDia = computed<EstudianteAsistenciaDia[]>(() =>
		this.estudiantes().map((e) => this.mapEstudianteAsistencia(e)),
	);

	readonly hasDayData = computed(() =>
		this.estudiantesDelDia().some((e) => e.estadoCodigo !== 'X' && e.estadoCodigo !== '-'),
	);

	readonly filteredEstudiantes = computed<EstudianteAsistenciaDia[]>(() => {
		const all = this.estudiantesDelDia();
		const status = this.activeStatus();
		const term = this.searchTerm();
		let result = all;
		if (status) {
			result = result.filter((e) => e.estadoCodigo === status);
		}
		if (term) {
			const lower = term.toLowerCase();
			result = result.filter(
				(e) =>
					e.nombreCompleto.toLowerCase().includes(lower) ||
					e.dni.toLowerCase().includes(lower),
			);
		}
		return result;
	});

	constructor() {
		effect(() => {
			this.fechaValue.set(this.fecha());
		});
	}

	onFechaChange(fecha: Date | null): void {
		if (fecha) {
			this.fechaValue.set(fecha);
			this.fechaChange.emit(fecha);
		}
	}

	onPreviousDay(): void {
		const prev = new Date(this.fechaValue());
		prev.setDate(prev.getDate() - 1);
		this.onFechaChange(prev);
	}

	onNextDay(): void {
		const next = new Date(this.fechaValue());
		next.setDate(next.getDate() + 1);
		if (next <= this.today) {
			this.onFechaChange(next);
		}
	}

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	// #endregion
	// #region Justificación

	onEstudianteClick(estudiante: EstudianteAsistenciaDia): void {
		if (!this.allowJustify() || !estudiante.puedeJustificar) return;

		this.selectedEstudiante.set(estudiante);
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

		this.closeDialog();
	}

	private mapEstudianteAsistencia(estudiante: EstudianteAsistencia): EstudianteAsistenciaDia {
		const asistencia = estudiante.asistencias[0];

		return {
			estudianteId: estudiante.estudianteId,
			nombreCompleto: estudiante.nombreCompleto,
			dni: estudiante.dni,
			horaEntrada: asistencia?.horaEntrada || null,
			horaSalida: asistencia?.horaSalida || null,
			estadoCodigo: asistencia?.estadoCodigo || 'X',
			observacion: asistencia?.observacion || null,
			// Cowork F-008: estado 'A' (Asistió) no admite justificación
			puedeJustificar:
				(asistencia?.puedeJustificar ?? true) && asistencia?.estadoCodigo !== 'A',
			esJustificado: asistencia?.esJustificado ?? false,
		};
	}
	// #endregion
}
