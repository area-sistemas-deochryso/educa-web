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
import {
	AttendanceStatus,
	EstadisticasAsistenciaDia,
	PersonaAsistencia,
	TipoPersona,
} from '@data/models/attendance.models';
import {
	ResponsiveTableComponent,
	SkeletonLoaderComponent,
	TableSkeletonComponent,
} from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';
import { FormatTimePipe } from '@shared/pipes';
import { getStatusClass } from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';

/**
 * Fila de asistencia del día — forma interna renderizada por la tabla.
 * Variante polimórfica de `EstudianteAsistenciaDia` (legacy).
 */
export interface PersonaAsistenciaDia {
	personaId: number;
	tipoPersona: TipoPersona;
	nombreCompleto: string;
	dni: string;
	horaEntrada: string | null;
	horaSalida: string | null;
	estadoCodigo: AttendanceStatus;
	observacion: string | null;
	puedeJustificar: boolean;
	esJustificado: boolean;
}

/**
 * Evento de justificación emitido por el day-list genérico.
 * Variante polimórfica de `JustificacionEvent` (legacy) — incluye tipoPersona
 * para que el caller decida el endpoint (estudiante vs profesor, INV-AD06).
 */
export interface JustificacionPersonaEvent {
	personaId: number;
	tipoPersona: TipoPersona;
	observacion: string;
	quitar: boolean;
}

/**
 * Variante genérica del `AttendanceDayListComponent` legacy.
 *
 * Acepta cualquier persona (estudiante o profesor) vía `PersonaAsistencia[]`.
 * El caller adapta desde `EstudianteAsistencia` / `AsistenciaProfesorDto` usando
 * los helpers de `@data/models/attendance.models`.
 *
 * Plan 21 Chat 7 — habilita la vista admin "Profesores" con el mismo diseño
 * que la vista admin "Estudiantes" sin tocar los 3 consumidores vivos del
 * day-list legacy.
 */
@Component({
	selector: 'app-attendance-persona-day-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		DatePickerModule,
		CardModule,
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
	],
	templateUrl: './attendance-persona-day-list.component.html',
	styleUrl: './attendance-persona-day-list.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePersonaDayListComponent {
	// * Inputs
	readonly personas = input.required<PersonaAsistencia[]>();
	readonly fecha = input.required<Date>();
	readonly estadisticas = input.required<EstadisticasAsistenciaDia>();
	readonly loading = input<boolean>(false);
	readonly showPdfButton = input<boolean>(false);
	readonly downloadingPdf = input<boolean>(false);
	readonly pdfMenuItems = input<MenuItem[]>([]);
	readonly allowJustify = input<boolean>(false);
	readonly savingJustificacion = input<boolean>(false);
	readonly tipoReporteOptions = input<
		{ label: string; items: { label: string; value: string }[] }[]
	>([]);
	readonly tipoReporte = input<string>('salon');
	/**
	 * Muestra columna/botón "Editar en admin" por fila (Plan 23 Chat 5 — cross-link).
	 * Gating a nivel padre: solo se activa desde la vista admin de profesores.
	 */
	readonly showEditAdminAction = input<boolean>(false);

	// * Outputs
	readonly fechaChange = output<Date>();
	readonly justificar = output<JustificacionPersonaEvent>();
	readonly tipoReporteChange = output<string>();
	readonly editAdmin = output<PersonaAsistenciaDia>();

	// * ViewChild
	@ViewChild('pdfMenu') pdfMenu!: Menu;

	// * Constants
	readonly today = new Date();
	readonly skeletonBadges = Array(7);
	private readonly baseDiaColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '100px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '80px', cellType: 'badge' },
	];
	readonly diaColumns = computed<SkeletonColumnDef[]>(() =>
		this.showEditAdminAction()
			? [...this.baseDiaColumns, { width: '70px', cellType: 'actions' } as SkeletonColumnDef]
			: this.baseDiaColumns,
	);
	private readonly PREFIJO_JUSTIFICACION = 'Justificado: ';

	// * Local state for the datepicker model (signal for OnPush reactivity)
	readonly fechaValue = signal<Date>(new Date());

	// #region Estado del diálogo de justificación
	readonly dialogVisible = signal(false);
	readonly selectedPersona = signal<PersonaAsistenciaDia | null>(null);
	readonly observacionText = signal('');

	// * Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	// * Computed: map raw personas to daily status rows
	readonly personasDelDia = computed<PersonaAsistenciaDia[]>(() =>
		this.personas().map((p) => this.mapPersonaAsistencia(p)),
	);

	constructor() {
		// * Sync datepicker model when parent updates the fecha input
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

	togglePdfMenu(event: Event): void {
		this.pdfMenu.toggle(event);
	}

	onEditAdminClick(event: Event, persona: PersonaAsistenciaDia): void {
		event.stopPropagation();
		this.editAdmin.emit(persona);
	}

	// #endregion
	// #region Justificación

	onPersonaClick(persona: PersonaAsistenciaDia): void {
		if (!this.allowJustify() || !persona.puedeJustificar) return;

		this.selectedPersona.set(persona);
		const observacion = persona.observacion || '';
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
		this.selectedPersona.set(null);
		this.observacionText.set('');
	}

	guardarJustificacion(): void {
		const persona = this.selectedPersona();
		const observacion = this.observacionText().trim();

		if (!persona || !observacion) return;

		this.justificar.emit({
			personaId: persona.personaId,
			tipoPersona: persona.tipoPersona,
			observacion,
			quitar: false,
		});

		this.closeDialog();
	}

	quitarJustificacion(): void {
		const persona = this.selectedPersona();
		if (!persona) return;

		this.justificar.emit({
			personaId: persona.personaId,
			tipoPersona: persona.tipoPersona,
			observacion: '',
			quitar: true,
		});

		this.closeDialog();
	}

	/**
	 * Mapea una persona con sus asistencias a un registro de asistencia del día.
	 * Usa estados ya calculados por el backend (INV-C01, INV-C02).
	 */
	private mapPersonaAsistencia(persona: PersonaAsistencia): PersonaAsistenciaDia {
		const asistencia = persona.asistencias[0];

		return {
			personaId: persona.personaId,
			tipoPersona: persona.tipoPersona,
			nombreCompleto: persona.nombreCompleto,
			dni: persona.dni,
			horaEntrada: asistencia?.horaEntrada || null,
			horaSalida: asistencia?.horaSalida || null,
			estadoCodigo: asistencia?.estadoCodigo || 'X',
			observacion: asistencia?.observacion || null,
			puedeJustificar: asistencia?.puedeJustificar ?? true,
			esJustificado: asistencia?.esJustificado ?? false,
		};
	}
	// #endregion
}
