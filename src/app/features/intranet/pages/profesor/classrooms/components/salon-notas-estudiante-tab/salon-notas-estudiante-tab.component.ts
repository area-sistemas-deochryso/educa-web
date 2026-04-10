import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SalonNotasResumenDto, calcularPromedioPonderado, NOTA_MAXIMA } from '../../../models';
import { getNotaSeverity, formatNotaConConfig } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

export interface NotaSaveEvent {
	calificacionId: number;
	estudianteId: number;
	nota: number | null;
}

interface EvaluacionRow {
	calificacionId: number;
	titulo: string;
	tipo: string;
	peso: number;
	nota: number | null;
	esGrupal: boolean;
}

@Component({
	selector: 'app-salon-notas-estudiante-tab',
	standalone: true,
	imports: [
		CommonModule,
		TableModule,
		TagModule,
		Select,
		FormsModule,
		SkeletonModule,
		ButtonModule,
		InputTextModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-notas-estudiante-tab.component.html',
	styleUrl: './salon-notas-estudiante-tab.component.scss',
})
export class SalonNotasEstudianteTabComponent {
	// #region Inputs
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly loading = input(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly estudiantes = input<{ estudianteId: number; dni: string; nombreCompleto: string }[]>([]);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	// #endregion

	// #region Outputs
	readonly cursoChange = output<number>();
	readonly notaSave = output<NotaSaveEvent>();
	// #endregion

	// #region Estado local
	readonly selectedEstudianteId = signal<number | null>(null);
	readonly simulatedNotas = signal<Record<number, number>>({});
	readonly simulatorOpen = signal(false);
	readonly editingCalificacionId = signal<number | null>(null);
	editNotaValue: number | null = null;
	// #endregion

	// #region Computed
	readonly estudianteOptions = computed(() =>
		this.estudiantes().map((e) => ({
			label: e.nombreCompleto,
			value: e.estudianteId,
		})),
	);

	readonly selectedEstudianteData = computed(() => {
		const data = this.notasData();
		const estId = this.selectedEstudianteId();
		if (!data || !estId) return null;
		return data.estudiantes.find((e) => e.estudianteId === estId) ?? null;
	});

	readonly evaluacionRows = computed<EvaluacionRow[]>(() => {
		const data = this.notasData();
		const est = this.selectedEstudianteData();
		if (!data || !est) return [];

		return data.evaluaciones.map((ev) => {
			const nota = est.notas.find((n) => n.calificacionId === ev.id);
			return {
				calificacionId: ev.id,
				titulo: ev.titulo,
				tipo: ev.tipo,
				peso: ev.peso,
				nota: nota?.nota ?? null,
				esGrupal: ev.esGrupal,
			};
		});
	});

	/** Count of evaluaciones without a grade (simulable) */
	readonly pendingCount = computed(() => this.evaluacionRows().filter((r) => r.nota === null).length);

	readonly hasSimulation = computed(() => Object.keys(this.simulatedNotas()).length > 0);

	readonly promedios = computed(() => {
		const est = this.selectedEstudianteData();
		return est?.promedios ?? [];
	});

	/**
	 * Recalculates ALL promedios (per period + general) using real + simulated grades.
	 * Returns a map: periodo name -> simulated promedio value.
	 */
	readonly simulatedPromedios = computed<Record<string, number | null>>(() => {
		const data = this.notasData();
		const est = this.selectedEstudianteData();
		const simulated = this.simulatedNotas();
		if (!data || !est || !this.hasSimulation()) return {};

		const periodos = data.periodos ?? [];
		const result: Record<string, number | null> = {};

		// Recalculate each period using evaluaciones in its week range
		for (const periodo of periodos) {
			const periodEvals = data.evaluaciones.filter(
				(ev) => ev.numeroSemana >= periodo.semanaInicio && ev.numeroSemana <= periodo.semanaFin,
			);
			const entries: { nota: number; peso: number }[] = [];
			for (const ev of periodEvals) {
				const realNota = est.notas.find((n) => n.calificacionId === ev.id)?.nota;
				const nota = realNota ?? simulated[ev.id] ?? null;
				if (nota !== null) {
					entries.push({ nota, peso: ev.peso });
				}
			}
			result[periodo.nombre] = calcularPromedioPonderado(entries);
		}

		// General = all evaluaciones
		const allEntries: { nota: number; peso: number }[] = [];
		for (const ev of data.evaluaciones) {
			const realNota = est.notas.find((n) => n.calificacionId === ev.id)?.nota;
			const nota = realNota ?? simulated[ev.id] ?? null;
			if (nota !== null) {
				allEntries.push({ nota, peso: ev.peso });
			}
		}
		result['General'] = calcularPromedioPonderado(allEntries);

		return result;
	});

	/**
	 * Group promedios by base name (e.g. "Cuatrimestre 1,2,3,4" -> one group).
	 * When simulator is active, replaces ALL period values with recalculated promedios.
	 */
	readonly promediosAgrupados = computed<
		{ grupo: string; items: { periodo: string; promedio: number | null; simulated: boolean }[] }[]
	>(() => {
		const proms = this.promedios();
		if (proms.length === 0) return [];

		const simProms = this.simulatedPromedios();

		const groups: { grupo: string; items: { periodo: string; promedio: number | null; simulated: boolean }[] }[] = [];
		const groupMap = new Map<string, { periodo: string; promedio: number | null; simulated: boolean }[]>();

		for (const p of proms) {
			const match = p.periodo.match(/^(.+?)\s+\d+$/);
			const key = match ? match[1] : p.periodo;

			if (!groupMap.has(key)) {
				const items: { periodo: string; promedio: number | null; simulated: boolean }[] = [];
				groupMap.set(key, items);
				groups.push({ grupo: key, items });
			}

			// Replace with simulated value when simulator is active
			const useSimulated = p.periodo in simProms;

			groupMap.get(key)!.push({
				periodo: p.periodo,
				promedio: useSimulated ? simProms[p.periodo]! : p.promedio,
				simulated: useSimulated,
			});
		}

		return groups;
	});
	// #endregion

	// #region Simulator handlers
	toggleSimulator(): void {
		const isOpen = !this.simulatorOpen();
		this.simulatorOpen.set(isOpen);
		if (!isOpen) {
			this.simulatedNotas.set({});
		}
	}

	onSimulatedNotaChange(calificacionId: number, value: number | null): void {
		this.simulatedNotas.update((current) => {
			const copy = { ...current };
			if (value !== null && value >= 0 && value <= NOTA_MAXIMA) {
				copy[calificacionId] = value;
			} else {
				delete copy[calificacionId];
			}
			return copy;
		});
	}

	getSimulatedNota(calificacionId: number): number | null {
		return this.simulatedNotas()[calificacionId] ?? null;
	}

	clearSimulation(): void {
		this.simulatedNotas.set({});
	}
	// #endregion

	// #region Edit handlers
	startEdit(row: EvaluacionRow): void {
		this.editingCalificacionId.set(row.calificacionId);
		this.editNotaValue = row.nota;
	}

	cancelEdit(): void {
		this.editingCalificacionId.set(null);
		this.editNotaValue = null;
	}

	saveEdit(): void {
		const calificacionId = this.editingCalificacionId();
		const estudianteId = this.selectedEstudianteId();
		if (!calificacionId || !estudianteId) return;

		// Empty field → delete the nota (null)
		const nota = this.editNotaValue;
		if (nota !== null && (nota < 0 || nota > NOTA_MAXIMA)) return;

		this.notaSave.emit({ calificacionId, estudianteId, nota });

		this.editingCalificacionId.set(null);
		this.editNotaValue = null;
	}

	onEditKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') this.saveEdit();
		if (event.key === 'Escape') this.cancelEdit();
	}
	// #endregion

	// #region Helpers
	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverity(nota, this.calificacionConfig());
	}

	formatNota(nota: number | null): string {
		return formatNotaConConfig(nota, this.calificacionConfig());
	}
	// #endregion
}
