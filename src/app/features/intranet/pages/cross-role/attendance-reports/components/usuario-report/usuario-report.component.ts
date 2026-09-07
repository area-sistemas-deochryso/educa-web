import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { PersonaParaSeleccion } from '@data/models';
import { downloadBlob, formatDateLocalIso, logger, slugifyFileNameSegment } from '@core/helpers';
import { EduAutoComplete, EduButton, EduDatePicker, EduTemplate } from '@edu-ui';
import type { EduAutoCompleteCompleteEvent } from '@edu-ui';
import { AttendanceReportsApiService } from '../../services';
import { TIPO_PERSONA_OPTIONS } from '../../config/attendance-reports.config';

const RANGO_MAX_DIAS = 366;

/**
 * Reporte de asistencia por usuario individual (Plan xrepo-109 F5/F6): un solo usuario
 * (cualquier rol), rango de fechas libre, entrada+salida diarias — solo descarga, sin
 * vista previa en tabla (a diferencia del reporte agrupado existente en este mismo tab).
 */
@Component({
	selector: 'app-usuario-report',
	standalone: true,
	imports: [FormsModule, EduAutoComplete, EduTemplate, EduDatePicker, EduButton],
	templateUrl: './usuario-report.component.html',
	styleUrl: './usuario-report.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioReportComponent {
	private readonly api = inject(AttendanceReportsApiService);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado
	readonly personaSuggestions = signal<PersonaParaSeleccion[]>([]);
	readonly searchingPersona = signal(false);
	readonly selectedPersona = signal<PersonaParaSeleccion | null>(null);
	readonly fechaInicio = signal<Date | null>(null);
	readonly fechaFin = signal<Date | null>(null);
	readonly descargandoPdf = signal(false);
	readonly descargandoExcel = signal(false);
	readonly error = signal<string | null>(null);
	// #endregion

	// #region Computed
	readonly rangoDias = computed(() => {
		const inicio = this.fechaInicio();
		const fin = this.fechaFin();
		if (!inicio || !fin) return 0;
		return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	});

	readonly rangoError = computed(() => {
		const dias = this.rangoDias();
		if (dias === 0) return '';
		if (dias < 0) return 'La fecha de fin no puede ser anterior a la de inicio.';
		if (dias > RANGO_MAX_DIAS) return `El rango no puede superar ${RANGO_MAX_DIAS} días.`;
		return '';
	});

	readonly isValid = computed(() =>
		this.selectedPersona() !== null
		&& this.fechaInicio() !== null
		&& this.fechaFin() !== null
		&& !this.rangoError(),
	);

	readonly personaLabel = computed(() => {
		const p = this.selectedPersona();
		if (!p) return '';
		const rol = TIPO_PERSONA_OPTIONS.find((o) => o.value === p.tipoPersona)?.label ?? p.tipoPersona;
		return `${p.nombreCompleto} — ${rol}`;
	});
	// #endregion

	// #region Persona
	onSearchPersona(event: EduAutoCompleteCompleteEvent): void {
		this.searchingPersona.set(true);
		this.api
			.buscarPersonas(event.query || '')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (personas) => {
					this.personaSuggestions.set(personas);
					this.searchingPersona.set(false);
				},
				error: () => {
					this.personaSuggestions.set([]);
					this.searchingPersona.set(false);
				},
			});
	}

	onSelectPersona(persona: PersonaParaSeleccion): void {
		this.selectedPersona.set(persona);
	}
	// #endregion

	// #region Rango de fechas
	onFechaRangoChange(value: Date[] | null): void {
		this.fechaInicio.set(value?.[0] ?? null);
		this.fechaFin.set(value?.[1] ?? null);
	}
	// #endregion

	// #region Descarga
	onDescargarPdf(): void {
		if (!this.isValid() || this.descargandoPdf()) return;
		this.descargandoPdf.set(true);
		this.error.set(null);

		this.api
			.descargarPdfUsuario({ persona: this.selectedPersona(), fechaInicio: this.fechaInicio(), fechaFin: this.fechaFin() })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					downloadBlob(blob, `${this.buildFileName()}.pdf`);
					this.descargandoPdf.set(false);
				},
				error: (err) => {
					logger.error('[UsuarioReport] Error al descargar PDF', err);
					this.error.set('Error al descargar el reporte.');
					this.descargandoPdf.set(false);
				},
			});
	}

	onDescargarExcel(): void {
		if (!this.isValid() || this.descargandoExcel()) return;
		this.descargandoExcel.set(true);
		this.error.set(null);

		this.api
			.descargarExcelUsuario({ persona: this.selectedPersona(), fechaInicio: this.fechaInicio(), fechaFin: this.fechaFin() })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					downloadBlob(blob, `${this.buildFileName()}.xlsx`);
					this.descargandoExcel.set(false);
				},
				error: (err) => {
					logger.error('[UsuarioReport] Error al descargar Excel', err);
					this.error.set('Error al descargar el reporte.');
					this.descargandoExcel.set(false);
				},
			});
	}

	/** Convención pedida: reporte_asistencia_{rol}_{nombre_completo}_{fechaInicio}_{fechaFin} */
	private buildFileName(): string {
		const persona = this.selectedPersona();
		const inicio = this.fechaInicio();
		const fin = this.fechaFin();
		if (!persona || !inicio || !fin) return 'reporte_asistencia';

		const rol = slugifyFileNameSegment(
			TIPO_PERSONA_OPTIONS.find((o) => o.value === persona.tipoPersona)?.label ?? persona.tipoPersona,
		);
		const nombre = slugifyFileNameSegment(persona.nombreCompleto);
		const fechaInicioStr = formatDateLocalIso(inicio).replace(/-/g, '');
		const fechaFinStr = formatDateLocalIso(fin).replace(/-/g, '');

		return `reporte_asistencia_${rol}_${nombre}_${fechaInicioStr}_${fechaFinStr}`;
	}
	// #endregion
}
