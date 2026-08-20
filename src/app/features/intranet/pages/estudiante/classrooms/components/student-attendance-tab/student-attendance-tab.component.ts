import { Component, ChangeDetectionStrategy, input, output, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { NivelEducativo } from '@core/helpers';
import { ErrorStateComponent } from '@shared/components';
import {
	MiAsistenciaCursoResumenDto,
	MiAsistenciaCursoItemDto,
	EstadoAsistenciaCurso,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
	SolicitudJustificacionAsistenciaDto,
	JustificarInasistenciaContext,
} from '@features/intranet/pages/estudiante/models';
import { JustificarInasistenciaDialogComponent } from '@features/intranet/pages/estudiante/components/justificar-inasistencia-dialog/justificar-inasistencia-dialog.component';

const MENSAJE_JUSTIFICACION_GESTIONADA = 'Las justificaciones las gestiona el colegio con tu apoderado';

export type JustificacionCellState =
	| { kind: 'text'; text: string }
	| { kind: 'gestionada' }
	| { kind: 'pendiente' }
	| { kind: 'justificar' }
	| { kind: 'rechazada'; motivoRechazo: string | null }
	| { kind: 'dash' };

@Component({
	selector: 'app-student-attendance-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, TagModule, SelectModule, ButtonModule, TooltipModule, JustificarInasistenciaDialogComponent, ErrorStateComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-attendance-tab.component.html',
	styleUrl: './student-attendance-tab.component.scss',
})
export class StudentAttendanceTabComponent implements OnInit {
	// #region Inputs/Outputs
	readonly asistenciaData = input<MiAsistenciaCursoResumenDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly error = input<string | null>(null);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly nivel = input<NivelEducativo | null>(null);
	readonly solicitudes = input<SolicitudJustificacionAsistenciaDto[]>([]);
	readonly justificarDialogVisible = input<boolean>(false);
	readonly justificarContext = input<JustificarInasistenciaContext | null>(null);
	readonly solicitudSaving = input<boolean>(false);
	readonly cursoChange = output<number>();
	readonly retry = output<void>();
	readonly abrirJustificar = output<JustificarInasistenciaContext>();
	readonly justificarDialogVisibleChange = output<boolean>();
	readonly guardarJustificacion = output<{ asistenciaCursoId: number; formData: FormData }>();
	// #endregion

	// #region Estado local
	selectedCursoLocal: number | null = null;
	readonly mensajeGestionada = MENSAJE_JUSTIFICACION_GESTIONADA;
	// #endregion

	// #region Computed
	readonly stats = computed(() => {
		const data = this.asistenciaData();
		if (!data) return null;
		const porcentaje = data.totalClases > 0
			? Math.round((data.totalPresente / data.totalClases) * 100)
			: 0;
		return {
			totalPresente: data.totalPresente,
			totalTarde: data.totalTarde,
			totalFalto: data.totalFalto,
			totalClases: data.totalClases,
			porcentajeAsistencia: porcentaje,
		};
	});

	readonly solicitudesPorAsistencia = computed(() => {
		const map = new Map<number, SolicitudJustificacionAsistenciaDto>();
		for (const s of this.solicitudes()) {
			const vigente = map.get(s.asistenciaCursoId);
			if (!vigente || new Date(s.fechaSolicitud).getTime() > new Date(vigente.fechaSolicitud).getTime()) {
				map.set(s.asistenciaCursoId, s);
			}
		}
		return map;
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const opts = this.cursoOptions();
		if (opts.length > 0 && !this.selectedCurso()) {
			this.selectedCursoLocal = opts[0].value;
			this.cursoChange.emit(opts[0].value);
		}
	}

	constructor() {
		effect(() => {
			const opts = this.cursoOptions();
			if (opts.length > 0 && !this.selectedCursoLocal) {
				this.selectedCursoLocal = opts[0].value;
				this.cursoChange.emit(opts[0].value);
			}
		});
	}
	// #endregion

	// #region Helpers
	getEstadoLabel(estado: string): string {
		return ESTADO_ASISTENCIA_LABELS[estado as EstadoAsistenciaCurso] ?? estado;
	}

	getEstadoSeverity(estado: string): 'success' | 'warn' | 'danger' | 'info' {
		return (ESTADO_ASISTENCIA_SEVERITIES[estado as EstadoAsistenciaCurso] ?? 'info') as 'success' | 'warn' | 'danger' | 'info';
	}

	getJustificacionState(item: MiAsistenciaCursoItemDto): JustificacionCellState {
		if (item.justificacion) return { kind: 'text', text: item.justificacion };
		if (item.estado !== 'F') return { kind: 'dash' };

		const nivelActual = this.nivel();
		if (nivelActual === 'Inicial' || nivelActual === 'Primaria') return { kind: 'gestionada' };

		const solicitud = this.solicitudesPorAsistencia().get(item.asistenciaCursoId);
		if (solicitud?.estado === 'PENDIENTE') return { kind: 'pendiente' };
		if (solicitud?.estado === 'RECHAZADA') {
			return { kind: 'rechazada', motivoRechazo: solicitud.motivoRechazo };
		}
		if (solicitud?.estado === 'APROBADA') return { kind: 'dash' };

		return { kind: 'justificar' };
	}

	onCursoChange(value: number): void {
		this.selectedCursoLocal = value;
		this.cursoChange.emit(value);
	}

	onRetry(): void {
		this.retry.emit();
	}

	onAbrirJustificar(item: MiAsistenciaCursoItemDto): void {
		const solicitud = this.solicitudesPorAsistencia().get(item.asistenciaCursoId);
		this.abrirJustificar.emit({
			asistenciaCursoId: item.asistenciaCursoId,
			fecha: item.fecha,
			motivoRechazoAnterior: solicitud?.estado === 'RECHAZADA' ? solicitud.motivoRechazo : null,
		});
	}
	// #endregion
}
