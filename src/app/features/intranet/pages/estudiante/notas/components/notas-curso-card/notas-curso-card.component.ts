import { Component, ChangeDetectionStrategy, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import {
	EstudianteMisNotasDto,
	PeriodoCalificacionDto,
	CalificacionConMiNotaDto,
} from '@features/intranet/pages/estudiante/models';
import {
	getNotaSeverity,
	formatNotaConConfig,
	calcularPorcentajeEvaluado,
	getPromedioSeverity,
	esPromedioProvisional,
} from '@intranet-shared/services/calificacion-config';
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

	/** % del peso total del curso que ya tiene nota registrada (INV-C04: pesos no se normalizan). */
	readonly porcentajeEvaluado = computed(() =>
		calcularPorcentajeEvaluado(this.curso().evaluaciones),
	);

	/** Color del promedio general, neutralizado mientras la cobertura evaluada esta por debajo del umbral. */
	readonly promedioSeverity = computed(() =>
		getPromedioSeverity(this.promedioGeneral(), this.porcentajeEvaluado(), this.calificacionConfig()),
	);

	readonly promedioProvisional = computed(() =>
		esPromedioProvisional(this.promedioGeneral(), this.porcentajeEvaluado()),
	);

	/**
	 * Conteo simple de evaluaciones (no ponderado) — distinto de `porcentajeEvaluado`,
	 * que pondera por peso. Se muestran juntos porque no siempre coinciden: una
	 * evaluación de peso alto pendiente cuenta distinto que una de peso bajo.
	 */
	readonly evaluacionesProgreso = computed(() => {
		const evaluaciones = this.curso().evaluaciones;
		const total = evaluaciones.length;
		const completadas = evaluaciones.filter((e) => e.nota !== null).length;
		return { completadas, total, faltantes: total - completadas };
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
