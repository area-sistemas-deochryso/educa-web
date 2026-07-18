import { Component, ChangeDetectionStrategy, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import {
	EstudianteMisNotasDto,
	PeriodoCalificacionDto,
	CalificacionConMiNotaDto,
} from '@features/intranet/pages/estudiante/models';
import { getNotaSeverity, formatNotaConConfig } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

interface PeriodoGroup {
	periodo: PeriodoCalificacionDto;
	promedio: number | null;
	evaluaciones: CalificacionConMiNotaDto[];
}

@Component({
	selector: 'app-notas-curso-card',
	standalone: true,
	imports: [CommonModule, TagModule, AccordionModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './notas-curso-card.component.html',
	styleUrl: './notas-curso-card.component.scss',
})
export class NotasCursoCardComponent {
	readonly curso = input.required<EstudianteMisNotasDto>();
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);

	readonly openPanels = signal<number[]>([]);

	constructor() {
		// Expande todos los períodos por defecto para que la nota real sea visible sin clics extra.
		effect(() => {
			const groups = this.periodoGroups();
			if (groups.length > 0 && this.openPanels().length === 0) {
				this.openPanels.set(groups.map((g) => g.periodo.id));
			}
		});
	}

	readonly promedioGeneral = computed(() => this.curso().promedios.general);

	readonly promedioSeverity = computed(() =>
		this.getNotaSeverity(this.promedioGeneral()),
	);

	/** % del peso total del curso que ya tiene nota registrada (INV-C04: pesos no se normalizan). */
	readonly porcentajeEvaluado = computed(() => {
		const evaluaciones = this.curso().evaluaciones;
		if (evaluaciones.length === 0) return 100;
		const pesoEvaluado = evaluaciones
			.filter((e) => e.nota !== null)
			.reduce((acc, e) => acc + e.peso, 0);
		return Math.round(pesoEvaluado * 100);
	});

	readonly periodoGroups = computed<PeriodoGroup[]>(() => {
		const curso = this.curso();

		// Curso sin períodos configurados: agrupar todas las evaluaciones bajo un único bloque "General".
		if (curso.periodos.length === 0) {
			if (curso.evaluaciones.length === 0) return [];
			return [
				{
					periodo: { id: -1, nombre: 'General', orden: 0, semanaInicio: 0, semanaFin: 0 },
					promedio: curso.promedios.general,
					evaluaciones: curso.evaluaciones,
				},
			];
		}

		const periodos = [...curso.periodos].sort((a, b) => a.orden - b.orden);
		const promedioMap = new Map(
			curso.promedios.porPeriodo.map((p) => [p.periodoNombre, p.promedio]),
		);

		return periodos.map((periodo) => ({
			periodo,
			promedio: promedioMap.get(periodo.nombre) ?? null,
			evaluaciones: curso.evaluaciones.filter(
				(e) => e.numeroSemana >= periodo.semanaInicio && e.numeroSemana <= periodo.semanaFin,
			),
		}));
	});

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverity(nota, this.calificacionConfig());
	}

	formatNota(nota: number | null): string {
		return formatNotaConConfig(nota, this.calificacionConfig());
	}

	getTipoLabel(tipo: string): string {
		return tipo;
	}
}
