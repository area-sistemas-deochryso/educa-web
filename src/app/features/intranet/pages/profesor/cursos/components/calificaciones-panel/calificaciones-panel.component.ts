import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import {
	CalificacionConNotasDto,
	PeriodoCalificacionDto,
	CalificacionDto,
	TIPOS_EVALUACION,
} from '../../../models';
import { formatNotaConConfig } from '@shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

@Component({
	selector: 'app-calificaciones-panel',
	standalone: true,
	imports: [CommonModule, ButtonModule, TooltipModule, TagModule],
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

	getNotasCount(cal: CalificacionConNotasDto): number {
		return cal.notas.length;
	}

	getPromedio(cal: CalificacionConNotasDto): string {
		if (cal.notas.length === 0) return '-';
		const sum = cal.notas.reduce((acc, n) => acc + n.nota, 0);
		const promedio = Math.round((sum / cal.notas.length) * 10) / 10;
		return formatNotaConConfig(promedio, this.calificacionConfig());
	}
	// #endregion
}
