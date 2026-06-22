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
import {
	AttendanceStatus,
	EstadisticasAsistenciaDia,
	PersonaAsistencia,
	TipoPersona,
} from '@data/models';
import { ResponsiveTableComponent, TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { FormatTimePipe } from '@intranet-shared/pipes';
import { getStatusClass } from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { InputTextModule } from 'primeng/inputtext';
import { AttendanceTemporalNavComponent } from '../attendance-temporal-nav/attendance-temporal-nav.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

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

export interface JustificacionPersonaEvent {
	personaId: number;
	tipoPersona: TipoPersona;
	observacion: string;
	quitar: boolean;
}

@Component({
	selector: 'app-attendance-persona-day-list',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		SkeletonModule,
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
	readonly showEditAdminAction = input<boolean>(false);
	readonly activeStatus = input<AttendanceStatus | null>(null);
	readonly hideTemporalNav = input(false);

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
	readonly searchTerm = signal('');

	// #region Estado del diálogo de justificación
	readonly dialogVisible = signal(false);
	readonly selectedPersona = signal<PersonaAsistenciaDia | null>(null);
	readonly observacionText = signal('');

	// * Expose getStatusClass for template
	readonly getStatusClass = getStatusClass;

	readonly isToday = computed(() => {
		const f = this.fecha();
		const t = this.today;
		return f.getDate() === t.getDate() && f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
	});

	// * Computed: map raw personas to daily status rows
	readonly personasDelDia = computed<PersonaAsistenciaDia[]>(() =>
		this.personas().map((p) => this.mapPersonaAsistencia(p)),
	);

	readonly hasDayData = computed(() =>
		this.personasDelDia().some((p) => p.estadoCodigo !== 'X' && p.estadoCodigo !== '-'),
	);

	readonly filteredPersonas = computed<PersonaAsistenciaDia[]>(() => {
		const all = this.personasDelDia();
		const status = this.activeStatus();
		const term = this.searchTerm();
		let result = all;
		if (status) {
			result = result.filter((p) => p.estadoCodigo === status);
		}
		if (term) {
			const lower = term.toLowerCase();
			result = result.filter(
				(p) =>
					p.nombreCompleto.toLowerCase().includes(lower) ||
					p.dni.toLowerCase().includes(lower),
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
			// Cowork F-008: estado 'A' (Asistió) no admite justificación
			puedeJustificar:
				(asistencia?.puedeJustificar ?? true) && asistencia?.estadoCodigo !== 'A',
			esJustificado: asistencia?.esJustificado ?? false,
		};
	}
	// #endregion
}
