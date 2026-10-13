import { Component, ChangeDetectionStrategy, input, output, computed, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';

import {
	CalificacionConNotasDto,
	PeriodoCalificacionDto,
	CalificacionDto,
	TIPOS_EVALUACION,
} from '@features/intranet/pages/profesor/models';
import { formatNotaConConfig } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { SkeletonLoaderComponent } from '@shared/components';
import { PluralizePipe } from '@intranet-shared/pipes';
import { EduButton, EduMenu, EduMenuItem, EduTag, EduTooltip } from '@edu-ui';

export type EvaluacionEstado = 'atrasada' | 'pendiente' | 'completa';

/** Fecha local `YYYY-MM-DD` de hoy (sin hora, para comparar por día). */
function hoyComoDia(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
	selector: 'app-calificaciones-panel',
	standalone: true,
	imports: [DatePipe, EduButton, EduMenu, EduTooltip, EduTag, SkeletonLoaderComponent, PluralizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificaciones-panel.component.html',
	styleUrl: './calificaciones-panel.component.scss',
})
export class CalificacionesPanelComponent {
	// #region Inputs
	readonly calificacionesPorSemana = input.required<Map<number, CalificacionConNotasDto[]>>();
	readonly periodos = input.required<PeriodoCalificacionDto[]>();
	readonly loading = input(false);
	readonly saving = input(false);
	readonly totalEvaluaciones = input(0);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	/** Alumnos del salón (denominador del progreso). 0 = desconocido: no se muestra progreso ni chip de estado. */
	readonly totalEstudiantes = input(0);
	// #endregion

	// #region Outputs
	readonly crearEvaluacion = output<void>();
	readonly editarEvaluacion = output<CalificacionDto>();
	readonly calificarEstudiantes = output<CalificacionConNotasDto>();
	readonly eliminarEvaluacion = output<CalificacionConNotasDto>();
	readonly cambiarTipo = output<CalificacionConNotasDto>();
	readonly configurarPeriodos = output<void>();
	// #endregion

	// #region Computed
	readonly semanaKeys = computed(() => {
		const map = this.calificacionesPorSemana();
		return [...map.keys()].sort((a, b) => a - b);
	});

	readonly tiposEvaluacion = TIPOS_EVALUACION;

	private readonly menu = viewChild.required<EduMenu>('rowMenu');
	private readonly menuTarget = signal<CalificacionConNotasDto | null>(null);

	/** Acciones del menú ⋯ para la evaluación seleccionada (mismas que ofrecía la fila). */
	readonly menuItems = computed<EduMenuItem[]>(() => {
		const cal = this.menuTarget();
		if (!cal) return [];
		return [
			{ label: 'Editar evaluación', icon: 'pi pi-file-edit', command: () => this.editarEvaluacion.emit(cal) },
			{
				label: cal.esGrupal ? 'Cambiar a individual' : 'Cambiar a grupal',
				icon: cal.esGrupal ? 'pi pi-user' : 'pi pi-users',
				command: () => this.cambiarTipo.emit(cal),
			},
			{ label: 'Eliminar evaluación', icon: 'pi pi-trash', command: () => this.eliminarEvaluacion.emit(cal) },
		];
	});
	// #endregion

	// #region Helpers
	getTipoSeverity(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
		switch (tipo) {
			case 'Tarea':
				return 'info';
			case 'Examen':
				return 'danger';
			case 'Exposicion':
				return 'warn';
			case 'Participacion':
				return 'success';
			default:
				return 'secondary';
		}
	}

	getPesoPercent(peso: number): string {
		return `${(peso * 100).toFixed(0)}%`;
	}

	/** Estudiantes distintos con nota. El BE omite a quien no tiene nota, así que no se compara con `null`. */
	getNotasCount(cal: CalificacionConNotasDto): number {
		return new Set(cal.notas.map((n) => n.estudianteId)).size;
	}

	getProgresoPercent(cal: CalificacionConNotasDto): number {
		const total = this.totalEstudiantes();
		if (total <= 0) return 0;
		return Math.min(100, Math.round((this.getNotasCount(cal) / total) * 100));
	}

	/** «Vencida» es por estudiante y la decide el BE (INV-C12): acá solo Atrasada / Pendiente / Completa. */
	getEstado(cal: CalificacionConNotasDto): EvaluacionEstado | null {
		const total = this.totalEstudiantes();
		if (total <= 0) return null;
		if (this.getNotasCount(cal) >= total) return 'completa';
		// La fecha llega con hora desde el BE: se compara por día, no por instante.
		return cal.fechaEvaluacion.slice(0, 10) < hoyComoDia() ? 'atrasada' : 'pendiente';
	}

	getEstadoLabel(estado: EvaluacionEstado): string {
		return { atrasada: 'Atrasada', pendiente: 'Pendiente', completa: 'Completa' }[estado];
	}

	openMenu(event: Event, cal: CalificacionConNotasDto): void {
		this.menuTarget.set(cal);
		this.menu().toggle(event);
	}

	getPromedio(cal: CalificacionConNotasDto): string {
		if (cal.notas.length === 0) return '-';
		const sum = cal.notas.reduce((acc, n) => acc + n.nota, 0);
		const promedio = Math.round((sum / cal.notas.length) * 10) / 10;
		return formatNotaConConfig(promedio, this.calificacionConfig());
	}
	// #endregion
}
