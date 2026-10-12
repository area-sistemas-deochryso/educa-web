import { Component, ChangeDetectionStrategy, computed, effect, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CursoChipComponent } from '@intranet-shared/components';

import {
	EstudianteMisNotasDto,
	PeriodoCalificacionDto,
	PromedioPeriodoDto,
	CalificacionConMiNotaDto,
} from '@features/intranet/pages/estudiante/models';
import {
	getNotaSeverity as getNotaSeverityFn,
	formatNotaConConfig,
	getRotuloParcial,
} from '@intranet-shared/services/calificacion-config';
import { EduAccordion, EduAccordionHeader, EduAccordionPanel, EduTag } from '@edu-ui';
/** Texto de un vacío de calificaciones: nunca "-" ni una cifra que se lea como desempeño (INV-C12). */
const SIN_CALIFICAR = 'Sin calificar aún';

interface PeriodoGroup {
	periodo: PeriodoCalificacionDto;
	/** Cifra a mostrar en el chip: parcial del periodo (INV-C12). `null` = sin cifra. */
	promedio: number | null;
	/** "Parcial · X % evaluado" mientras la cobertura del periodo < 100 %. */
	rotulo: string | null;
	/** Periodo con evaluaciones pero ninguna calificada: el chip dice "Sin calificar aún", nunca una cifra. */
	sinCalificar: boolean;
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
	protected readonly SIN_CALIFICAR = SIN_CALIFICAR;

	readonly curso = input.required<EstudianteMisNotasDto>();
	/** Escala del salón del curso (INV-U06), resuelta por el BE. */
	readonly calificacionConfig = computed(() => this.curso().escalaCalificacion ?? null);

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

	/** Promedio parcial del BE (INV-C12). `null` con cobertura 0: la UI dice "Sin calificar aún", nunca una cifra. */
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
					promedio: this.sinCalificar() ? null : this.promedioParcial(),
					rotulo: this.rotuloParcial(),
					sinCalificar: this.sinCalificar(),
					evaluaciones: curso.evaluaciones,
				}];
		}

		const periodos = [...curso.periodos].sort((a, b) => a.orden - b.orden);
		const promedioMap = new Map(curso.promedios.porPeriodo.map((p) => [p.periodoNombre, p]));

		return periodos.map((periodo) => {
			const evaluaciones = curso.evaluaciones.filter(
				(e) => e.numeroSemana >= periodo.semanaInicio && e.numeroSemana <= periodo.semanaFin,
			);
			return { periodo, evaluaciones, ...this.presentarPeriodo(promedioMap.get(periodo.nombre), evaluaciones.length) };
		});
	});

	/**
	 * Parcial y cobertura del periodo los entrega el BE (INV-C12 § Parcial por periodo); el FE solo los presenta.
	 * Sin los campos nuevos (BE anterior) cae al promedio de antes, sin rótulo, para no romper.
	 */
	private presentarPeriodo(
		p: PromedioPeriodoDto | undefined,
		totalEvaluaciones: number,
	): Pick<PeriodoGroup, 'promedio' | 'rotulo' | 'sinCalificar'> {
		if (totalEvaluaciones === 0) return { promedio: null, rotulo: null, sinCalificar: true };
		if (p?.coberturaEvaluada === undefined) {
			const promedio = p?.promedio ?? null;
			return { promedio, rotulo: null, sinCalificar: promedio === null };
		}
		if (p.coberturaEvaluada === 0 || p.promedioParcial == null) {
			return { promedio: null, rotulo: null, sinCalificar: true };
		}
		return { promedio: p.promedioParcial, rotulo: getRotuloParcial(p.coberturaEvaluada), sinCalificar: false };
	}

	/** Nota a presentar: la del estudiante, o 0 si la evaluación está vencida sin nota (INV-C12). `null` = vacío. */
	notaPresentada(e: CalificacionConMiNotaDto): number | null {
		return e.nota ?? (e.vencida ? 0 : null);
	}

	/** Evaluación sin nota antes del plazo: "Sin calificar aún"; vencida: 0 con la escala del curso (INV-C12, INV-U06). */
	notaEvaluacion(e: CalificacionConMiNotaDto): string {
		const nota = this.notaPresentada(e);
		return nota === null ? SIN_CALIFICAR : this.formatNota(nota);
	}

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
