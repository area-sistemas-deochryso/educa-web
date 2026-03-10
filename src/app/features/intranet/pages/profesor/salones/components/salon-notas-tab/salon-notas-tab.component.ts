import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import {
	SalonNotasResumenDto,
	CalificacionDto,
	PeriodoCalificacionDto,
	VistaPromedio,
} from '../../../models';

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
	selector: 'app-salon-notas-tab',
	standalone: true,
	imports: [
		CommonModule,
		SlicePipe,
		TableModule,
		TagModule,
		Select,
		FormsModule,
		SelectButtonModule,
		SkeletonModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-notas-tab.component.html',
	styleUrl: './salon-notas-tab.component.scss',
})
export class SalonNotasTabComponent {
	// #region Inputs
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly loading = input(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly vistaActual = input<VistaPromedio>('semana');
	// #endregion

	// #region Outputs
	readonly cursoChange = output<number>();
	readonly vistaChange = output<VistaPromedio>();
	// #endregion

	// #region Estado local
	readonly vistaOptions = [
		{ label: 'Semana', value: 'semana' },
		{ label: 'Periodo', value: 'periodo' },
		{ label: 'Año', value: 'anual' },
	];
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
	// #endregion

	// #region Helpers
	getNota(estudianteId: number, calificacionId: number): number | null {
		return this.notasLookup().get(estudianteId)?.get(calificacionId) ?? null;
	}

	getPromedio(estudianteId: number, periodoNombre: string): number | null {
		return this.promediosLookup().get(estudianteId)?.get(periodoNombre) ?? null;
	}

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		if (nota === null || nota === undefined) return 'secondary';
		if (nota >= 14) return 'success';
		if (nota >= 11) return 'warn';
		return 'danger';
	}

	formatNota(nota: number | null): string {
		if (nota === null || nota === undefined) return '-';
		return nota.toFixed(1);
	}
	// #endregion
}
