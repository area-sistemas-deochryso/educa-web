import { Component, ChangeDetectionStrategy, computed, effect, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CursoChipComponent } from '@intranet-shared/components';

import {
	EstudianteMisNotasDto,
	PeriodoCalificacionDto,
	CalificacionConMiNotaDto,
} from '@features/intranet/pages/estudiante/models';
import {
	getNotaSeverity as getNotaSeverityFn,
	formatNotaConConfig,
	getRotuloParcial,
} from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduTag } from '@edu-ui';
interface PeriodoGroup {
	periodo: PeriodoCalificacionDto;
	promedio: number | null;
	evaluaciones: CalificacionConMiNotaDto[];
}

@Component({
	selector: 'app-notas-curso-card',
	standalone: true,
	imports: [DatePipe, CursoChipComponent, EduTag, EduAccordion, EduAccordionHeader, EduAccordionPanel],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './notas-curso-card.component.html',
	styleUrl: './notas-curso-card.component.scss',
})
export class NotasCursoCardComponent {
	readonly curso = input.required<EstudianteMisNotasDto>();
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);

	readonly openPanels = signal<number[]>([]);

	// edu-accordion's [value] is string-based (no numeric convention) — periodo ids are
	// numeric, so this bridges the two at the template boundary only.
	readonly openPanelsStr = computed(() => this.openPanels().map((v) => v.toString()));

	onOpenPanelsChangeStr(values: string[]): void {
		this.openPanels.set(values.map((v) => Number(v)));
	}

	constructor() {
		// Expande todos los períodos por defecto para que la nota real sea visible sin clics extra.
		effect(() => {
			const groups = this.periodoGroups();
			if (groups.length > 0 && this.openPanels().length === 0) {
				this.openPanels.set(groups.map((g) => g.periodo.id));
			}
		});
	}

	/** Promedio parcial del BE (INV-C12). `null` con cobertura 0: la UI dice "Sin calificar", nunca una cifra. */
	readonly promedioParcial = computed(() => this.curso().promedios.promedioParcial);

	/** % del curso con nota, entregado por el BE (INV-C12) — el FE no lo deriva. */
	readonly coberturaEvaluada = computed(() => this.curso().promedios.coberturaEvaluada);

	readonly sinCalificar = computed(() => this.coberturaEvaluada() === 0 || this.promedioParcial() === null);

	/** "Parcial · X % evaluado" mientras la cobertura < 100 %; sin rotulo al 100 %. */
	readonly rotuloParcial = computed(() =>
		this.sinCalificar() ? null : getRotuloParcial(this.coberturaEvaluada()),
	);

	/** Semaforo sobre el parcial, sin neutralizar por cobertura (INV-C12). */
	readonly promedioSeverity = computed(() => getNotaSeverityFn(this.promedioParcial(), this.calificacionConfig()));

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
					promedio: curso.promedios.promedioParcial,
					evaluaciones: curso.evaluaciones,
				}];
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
		return getNotaSeverityFn(nota, this.calificacionConfig());
	}

	formatNota(nota: number | null): string {
		return formatNotaConConfig(nota, this.calificacionConfig());
	}

	getTipoLabel(tipo: string): string {
		return tipo;
	}
}
