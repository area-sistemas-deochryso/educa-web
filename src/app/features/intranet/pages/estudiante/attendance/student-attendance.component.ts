import {
	Component,
	ChangeDetectionStrategy,
	computed,
	effect,
	inject,
	signal,
	OnInit,
	DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry, detectarNivel } from '@core/helpers';
import { ErrorStateComponent } from '@shared/components';
import { PageHeaderComponent } from '@intranet-shared/components';
import { EstudianteFacade } from '../services/estudiante.facade';
import {
	HorarioProfesorDto,
	MiAsistenciaCursoResumenDto,
	MiAsistenciaCursoItemDto,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
	SolicitudJustificacionAsistenciaDto,
	JustificarInasistenciaContext,
} from '../models/estudiante.models';
import { JustificarInasistenciaDialogComponent } from '../components/justificar-inasistencia-dialog/justificar-inasistencia-dialog.component';
import { EduSelect, EduSpinner, EduTable, EduTag, EduTooltip } from '@edu-ui';

const MENSAJE_JUSTIFICACION_GESTIONADA = 'Las justificaciones las gestiona el colegio con tu apoderado';

type JustificacionCellState =
	| { kind: 'text'; text: string }
	| { kind: 'gestionada' }
	| { kind: 'pendiente' }
	| { kind: 'justificar' }
	| { kind: 'rechazada'; motivoRechazo: string | null }
	| { kind: 'dash' };

@Component({
	selector: 'app-student-attendance',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		EduSelect,
		EduTag,
		EduTable,
		EduSpinner,
		ButtonModule,
		EduTooltip,
		PageHeaderComponent,
		JustificarInasistenciaDialogComponent,
		ErrorStateComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-attendance.component.html',
	styleUrl: './student-attendance.component.scss',
})
export class StudentAttendanceComponent implements OnInit {
	// #region Dependencias
	private readonly api = inject(EstudianteFacade);
	private readonly destroyRef = inject(DestroyRef);
	private readonly route = inject(ActivatedRoute);
	// #endregion

	// #region Estado
	private readonly _horarios = signal<HorarioProfesorDto[]>([]);
	private readonly _pageLoading = signal(false);
	private readonly _horariosError = signal<string | null>(null);
	private readonly _asistencia = signal<MiAsistenciaCursoResumenDto | null>(null);
	private readonly _asistenciaLoading = signal(false);
	private readonly _asistenciaError = signal<string | null>(null);
	private readonly _solicitudes = signal<SolicitudJustificacionAsistenciaDto[]>([]);
	private readonly _justificarDialogVisible = signal(false);
	private readonly _justificarContext = signal<JustificarInasistenciaContext | null>(null);
	private readonly _solicitudSaving = signal(false);

	readonly pageLoading = this._pageLoading.asReadonly();
	readonly horariosError = this._horariosError.asReadonly();
	readonly asistencia = this._asistencia.asReadonly();
	readonly asistenciaLoading = this._asistenciaLoading.asReadonly();
	readonly asistenciaError = this._asistenciaError.asReadonly();
	readonly solicitudes = this._solicitudes.asReadonly();
	readonly justificarDialogVisible = this._justificarDialogVisible.asReadonly();
	readonly justificarContext = this._justificarContext.asReadonly();
	readonly solicitudSaving = this._solicitudSaving.asReadonly();
	readonly mensajeGestionada = MENSAJE_JUSTIFICACION_GESTIONADA;

	private readonly solicitudesPorAsistencia = computed(() => {
		const map = new Map<number, SolicitudJustificacionAsistenciaDto>();
		for (const s of this._solicitudes()) {
			const vigente = map.get(s.asistenciaCursoId);
			if (!vigente || new Date(s.fechaSolicitud).getTime() > new Date(vigente.fechaSolicitud).getTime()) {
				map.set(s.asistenciaCursoId, s);
			}
		}
		return map;
	});

	selectedHorarioId = signal<number | null>(null);

	readonly cursoOptions = computed(() => {
		const horarios = this._horarios();
		const seen = new Map<string, boolean>();
		const options: { label: string; value: number }[] = [];

		for (const h of horarios) {
			const key = `${h.cursoId}-${h.salonId}`;
			if (!seen.has(key)) {
				seen.set(key, true);
				options.push({
					label: `${h.cursoNombre} - ${h.salonDescripcion}`,
					value: h.id,
				});
			}
		}

		return options.sort((a, b) => a.label.localeCompare(b.label));
	});

	readonly porcentaje = computed(() => {
		const data = this.asistencia();
		if (!data || data.totalClases === 0) return 0;
		return Math.round(((data.totalPresente + data.totalTarde) / data.totalClases) * 100);
	});

	readonly selectedNivel = computed(() => {
		const horario = this._horarios().find((h) => h.id === this.selectedHorarioId());
		const salonDescripcion = horario?.salonDescripcion ?? this.asistencia()?.salonDescripcion;
		return salonDescripcion ? detectarNivel(salonDescripcion) : null;
	});
	// #endregion

	// #region Lifecycle
	private readonly pendingHorarioId = signal<number | null>(null);

	constructor() {
		const qpHorarioId = Number(this.route.snapshot.queryParamMap.get('horarioId'));
		if (qpHorarioId > 0) this.pendingHorarioId.set(qpHorarioId);

		effect(() => {
			const opts = this.cursoOptions();
			const pending = this.pendingHorarioId();
			if (pending && opts.some((o) => o.value === pending)) {
				this.pendingHorarioId.set(null);
				this.selectedHorarioId.set(pending);
				this.loadAsistencia(pending);
			}
		});
	}

	ngOnInit(): void {
		this.loadHorarios();

		this.api
			.getMisSolicitudes()
			.pipe(withRetry({ tag: 'EstudianteAsistencia:loadSolicitudes' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (solicitudes) => this._solicitudes.set(solicitudes),
				error: (err) => logger.error('EstudianteAsistencia: Error al cargar solicitudes', err),
			});
	}
	// #endregion

	// #region Handlers
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.loadAsistencia(horarioId);
	}

	onRetryHorarios(): void {
		this.loadHorarios();
	}

	onRetryAsistencia(): void {
		const horarioId = this.selectedHorarioId();
		if (horarioId) this.loadAsistencia(horarioId);
	}

	getEstadoLabel(estado: string): string {
		return ESTADO_ASISTENCIA_LABELS[estado as keyof typeof ESTADO_ASISTENCIA_LABELS] ?? estado;
	}

	getEstadoSeverity(
		estado: string,
	): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
		return (ESTADO_ASISTENCIA_SEVERITIES[estado as keyof typeof ESTADO_ASISTENCIA_SEVERITIES] ??
			'info') as 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
	}

	getJustificacionState(item: MiAsistenciaCursoItemDto): JustificacionCellState {
		if (item.justificacion) return { kind: 'text', text: item.justificacion };
		if (item.estado !== 'F') return { kind: 'dash' };

		const nivel = this.selectedNivel();
		if (nivel === 'Inicial' || nivel === 'Primaria') return { kind: 'gestionada' };

		const solicitud = this.solicitudesPorAsistencia().get(item.asistenciaCursoId);
		if (solicitud?.estado === 'PENDIENTE') return { kind: 'pendiente' };
		if (solicitud?.estado === 'RECHAZADA') {
			return { kind: 'rechazada', motivoRechazo: solicitud.motivoRechazo };
		}
		if (solicitud?.estado === 'APROBADA') return { kind: 'dash' };

		return { kind: 'justificar' };
	}

	onAbrirJustificar(item: MiAsistenciaCursoItemDto): void {
		const solicitud = this.solicitudesPorAsistencia().get(item.asistenciaCursoId);
		this._justificarContext.set({
			asistenciaCursoId: item.asistenciaCursoId,
			fecha: item.fecha,
			motivoRechazoAnterior: solicitud?.estado === 'RECHAZADA' ? solicitud.motivoRechazo : null,
		});
		this._justificarDialogVisible.set(true);
	}

	onJustificarDialogVisibleChange(visible: boolean): void {
		this._justificarDialogVisible.set(visible);
		if (!visible) this._justificarContext.set(null);
	}

	onGuardarJustificacion(payload: { asistenciaCursoId: number; formData: FormData }): void {
		this._solicitudSaving.set(true);
		this.api
			.crearSolicitudJustificacion(payload.formData)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (solicitud) => {
					this._solicitudes.update((current) => [...current, solicitud]);
					this._solicitudSaving.set(false);
					this._justificarDialogVisible.set(false);
					this._justificarContext.set(null);
				},
				error: (err) => {
					logger.error('EstudianteAsistencia: Error al crear solicitud de justificación', err);
					this._solicitudSaving.set(false);
				},
			});
	}
	// #endregion

	// #region Helpers privados
	private loadHorarios(): void {
		this._pageLoading.set(true);
		this._horariosError.set(null);
		this.api
			.getMiAsistenciaActiva()
			.pipe(withRetry({ tag: 'EstudianteAsistencia:loadHorarios' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resolucion) => {
					this._pageLoading.set(false);

					// Curso activo resuelto server-side (único horario) — ya viene el resumen,
					// no hace falta la segunda llamada.
					if (resolucion.resumen) {
						this.selectedHorarioId.set(resolucion.resumen.horarioId);
						this._asistencia.set(resolucion.resumen);
						return;
					}

					this._horarios.set(resolucion.horarios ?? []);

					// Auto-select first if only one and no pending query-param selection
					const opts = this.cursoOptions();
					if (opts.length === 1 && !this.pendingHorarioId()) {
						this.selectedHorarioId.set(opts[0].value);
						this.loadAsistencia(opts[0].value);
					}
				},
				error: (err) => {
					logger.error('EstudianteAsistencia: Error al cargar horarios', err);
					this._pageLoading.set(false);
					this._horariosError.set('No se pudieron cargar tus cursos.');
				},
			});
	}

	private loadAsistencia(horarioId: number): void {
		this._asistenciaLoading.set(true);
		this._asistenciaError.set(null);
		this.api
			.getMiAsistencia(horarioId)
			.pipe(withRetry({ tag: 'EstudianteAsistencia:load' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this._asistencia.set(data);
					this._asistenciaLoading.set(false);
				},
				error: (err) => {
					logger.error('EstudianteAsistencia: Error al cargar asistencia', err);
					this._asistenciaLoading.set(false);
					this._asistenciaError.set('No se pudo cargar tu asistencia.');
				},
			});
	}
	// #endregion
}
