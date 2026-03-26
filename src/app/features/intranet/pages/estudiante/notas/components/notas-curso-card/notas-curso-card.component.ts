import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import {
	EstudianteMisNotasDto,
	VistaPromedio,
} from '../../../models';
import { getNotaSeverity, formatNotaConConfig } from '@shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

@Component({
	selector: 'app-notas-curso-card',
	standalone: true,
	imports: [CommonModule, TagModule, DividerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './notas-curso-card.component.html',
	styleUrl: './notas-curso-card.component.scss',
})
export class NotasCursoCardComponent {
	// #region Inputs
	readonly curso = input.required<EstudianteMisNotasDto>();
	readonly vistaActual = input<VistaPromedio>('semana');
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	// #endregion

	// #region Computed
	readonly promedioGeneral = computed(() => this.curso().promedios.general);

	readonly promedioSeverity = computed(() =>
		this.getNotaSeverity(this.promedioGeneral()),
	);

	readonly promedios = computed(() => {
		const vista = this.vistaActual();
		const proms = this.curso().promedios;

		if (vista === 'semana') {
			return proms.porSemana.map((s) => ({
				label: `S${s.numeroSemana}`,
				value: s.promedio,
			}));
		}
		if (vista === 'periodo') {
			return proms.porPeriodo.map((p) => ({
				label: p.periodoNombre,
				value: p.promedio,
			}));
		}
		// anual
		return [{ label: 'Año', value: proms.general }];
	});
	// #endregion

	// #region Helpers
	getTipoLabel(tipo: string): string {
		return tipo;
	}

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverity(nota, this.calificacionConfig());
	}

	formatNota(nota: number | null): string {
		return formatNotaConConfig(nota, this.calificacionConfig());
	}
	// #endregion
}
