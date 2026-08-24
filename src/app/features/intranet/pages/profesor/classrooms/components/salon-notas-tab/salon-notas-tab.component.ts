import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';

import {
	SalonNotasResumenDto,
	CalificacionDto,
	PeriodoCalificacionDto,
	VistaPromedio,
} from '@features/intranet/pages/profesor/models';
import {
	getNotaSeverity,
	formatNotaConConfig,
	calcularPorcentajeEvaluado,
	getPromedioSeverity,
	esPromedioProvisional,
} from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { ErrorStateComponent } from '@shared/components';
import { EduSelect, EduSelectButton, EduSkeleton, EduTable, EduTag, EduTooltip } from '@edu-ui';

interface PeriodoColumnsGroup {
	periodo: PeriodoCalificacionDto;
	evaluaciones: CalificacionDto[];
	colspan: number;
}

interface SemanaColumnsGroup {
	semana: number;
	evaluaciones: CalificacionDto[];
	colspan: number;
}

@Component({
	selector: 'app-classroom-grades-tab',
	standalone: true,
	imports: [CommonModule, SlicePipe, RouterLink, EduTable, EduTag, EduSelect, FormsModule, EduSelectButton, EduSkeleton, ButtonModule, EduTooltip, ErrorStateComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-notas-tab.component.html',
	styleUrl: './salon-notas-tab.component.scss',
})
export class ClassroomGradesTabComponent {
	// #region Inputs
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly loading = input(false);
	readonly error = input<string | null>(null);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly vistaActual = input<VistaPromedio>('semana');
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	// #endregion

	// #region Outputs
	readonly cursoChange = output<number>();
	readonly retry = output<void>();
	readonly vistaChange = output<VistaPromedio>();
	readonly descargarBoletas = output<void>();
	// #endregion

	// #region Estado local
	readonly vistaOptions = [
		{ label: 'Semana', value: 'semana' },
		{ label: 'Periodo', value: 'periodo' },
		{ label: 'Año', value: 'anual' }];
	// #endregion

	// #region Computed
	readonly hasData = computed(() => {
		const data = this.notasData();
		return data && data.estudiantes.length > 0;
	});

	/** Evaluaciones grouped by their containing period, sorted by periodo.orden */
	readonly evaluacionesPorPeriodo = computed<PeriodoColumnsGroup[]>(() => {
		const data = this.notasData();
		if (!data) return [];

		return data.periodos
			.slice()
			.sort((a, b) => a.orden - b.orden)
			.map((periodo) => {
				const evals = data.evaluaciones
					.filter(
						(ev) =>
							ev.numeroSemana >= periodo.semanaInicio && ev.numeroSemana <= periodo.semanaFin,
					)
					.sort((a, b) => a.numeroSemana - b.numeroSemana);
				return { periodo, evaluaciones: evals, colspan: evals.length + 1 };
			});
	});

	/** Evaluaciones grouped by actual week number, sorted ascending */
	readonly evaluacionesPorSemana = computed<SemanaColumnsGroup[]>(() => {
		const data = this.notasData();
		if (!data) return [];

		const semanaMap = new Map<number, CalificacionDto[]>();
		for (const ev of data.evaluaciones) {
			const list = semanaMap.get(ev.numeroSemana) ?? [];
			list.push(ev);
			semanaMap.set(ev.numeroSemana, list);
		}

		return Array.from(semanaMap.entries())
			.sort(([a], [b]) => a - b)
			.map(([semana, evals]) => ({
				semana,
				evaluaciones: evals,
				colspan: evals.length,
			}));
	});

	/** estudianteId -> calificacionId -> nota (O(1) lookup) */
	readonly notasLookup = computed(() => {
		const data = this.notasData();
		if (!data) return new Map<number, Map<number, number | null>>();

		const map = new Map<number, Map<number, number | null>>();
		for (const est of data.estudiantes) {
			const inner = new Map<number, number | null>();
			for (const n of est.notas) {
				inner.set(n.calificacionId, n.nota);
			}
			map.set(est.estudianteId, inner);
		}
		return map;
	});

	/** estudianteId -> periodoNombre -> promedio (O(1) lookup) */
	readonly promediosLookup = computed(() => {
		const data = this.notasData();
		if (!data) return new Map<number, Map<string, number | null>>();

		const map = new Map<number, Map<string, number | null>>();
		for (const est of data.estudiantes) {
			const inner = new Map<string, number | null>();
			for (const p of est.promedios) {
				inner.set(p.periodo, p.promedio);
			}
			map.set(est.estudianteId, inner);
		}
		return map;
	});

	/** estudianteId -> % del curso evaluado (INV-C04: pesos no se normalizan). */
	readonly porcentajeEvaluadoLookup = computed(() => {
		const data = this.notasData();
		if (!data) return new Map<number, number>();

		const notas = this.notasLookup();
		const map = new Map<number, number>();
		for (const est of data.estudiantes) {
			const notasEst = notas.get(est.estudianteId);
			const evaluaciones = data.evaluaciones.map((ev) => ({
				peso: ev.peso,
				nota: notasEst?.get(ev.id) ?? null,
			}));
			map.set(est.estudianteId, calcularPorcentajeEvaluado(evaluaciones));
		}
		return map;
	});
	// #endregion

	readonly formattedNotas = computed(() => {
		const lookup = this.notasLookup();
		const config = this.calificacionConfig();
		const map = new Map<string, { text: string; severity: 'success' | 'warn' | 'danger' | 'secondary' }>();
		for (const [estId, inner] of lookup) {
			for (const [calId, nota] of inner) {
				map.set(`${estId}-${calId}`, {
					text: formatNotaConConfig(nota, config),
					severity: getNotaSeverity(nota, config),
				});
			}
		}
		return map;
	});

	/**
	 * El promedio "General" usa color consciente de cobertura (neutro por debajo
	 * del umbral); los promedios por periodo usan el semaforo real sin cambios.
	 */
	readonly formattedPromedios = computed(() => {
		const lookup = this.promediosLookup();
		const config = this.calificacionConfig();
		const coberturaLookup = this.porcentajeEvaluadoLookup();
		const map = new Map<
			string,
			{ text: string; severity: 'success' | 'warn' | 'danger' | 'secondary'; provisional: boolean }
		>();
		for (const [estId, inner] of lookup) {
			const porcentajeEvaluado = coberturaLookup.get(estId) ?? 100;
			for (const [periodo, promedio] of inner) {
				const esGeneral = periodo === 'General';
				map.set(`${estId}-${periodo}`, {
					text: formatNotaConConfig(promedio, config),
					severity: esGeneral
						? getPromedioSeverity(promedio, porcentajeEvaluado, config)
						: getNotaSeverity(promedio, config),
					provisional: esGeneral && esPromedioProvisional(promedio, porcentajeEvaluado),
				});
			}
		}
		return map;
	});
}
