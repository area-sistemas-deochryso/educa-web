import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
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

	readonly promedioGeneral = computed(() => this.curso().promedios.general);

	readonly promedioSeverity = computed(() =>
		this.getNotaSeverity(this.promedioGeneral()),
	);

	readonly periodoGroups = computed<PeriodoGroup[]>(() => {
		const curso = this.curso();
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
