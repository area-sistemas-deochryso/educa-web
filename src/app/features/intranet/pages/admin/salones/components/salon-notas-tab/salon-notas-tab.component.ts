import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { HorarioResponseDto, SalonNotasResumenDto, ConfiguracionCalificacionListDto } from '@data/models';
import { isNotaAprobada, formatNotaConConfig } from '@shared/services/calificacion-config';

@Component({
	selector: 'app-salon-notas-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule, TooltipModule],
	templateUrl: './salon-notas-tab.component.html',
	styleUrl: './salon-notas-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonNotasTabComponent {
	// #region Inputs / Outputs
	readonly notasData = input<SalonNotasResumenDto | null>(null);
	readonly loading = input(false);
	readonly horarios = input<HorarioResponseDto[]>([]);
	readonly horariosLoading = input(false);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);

	readonly cursoChange = output<{ salonId: number; cursoId: number }>();
	// #endregion

	// #region Estado local
	readonly selectedCursoId = signal<number | null>(null);
	// #endregion

	// #region Computed
	readonly cursoOptions = computed(() => {
		const horarios = this.horarios();
		// Deduplicar por cursoId
		const seen = new Set<number>();
		return horarios
			.filter((h) => {
				if (seen.has(h.cursoId)) return false;
				seen.add(h.cursoId);
				return true;
			})
			.map((h) => ({ label: h.cursoNombre, value: h.cursoId, salonId: h.salonId }));
	});

	readonly evaluacionColumns = computed(() => {
		const data = this.notasData();
		if (!data) return [];
		return data.evaluaciones.map((e) => ({
			id: e.id,
			titulo: e.titulo,
			tipo: e.tipo,
			peso: e.peso,
		}));
	});

	readonly periodoColumns = computed(() => {
		const data = this.notasData();
		if (!data) return [];
		return data.periodos.map((p) => ({
			nombre: p.nombre,
		}));
	});
	// #endregion

	// #region Event handlers
	onCursoChange(cursoId: number): void {
		this.selectedCursoId.set(cursoId);
		const opt = this.cursoOptions().find((o) => o.value === cursoId);
		if (opt) {
			this.cursoChange.emit({ salonId: opt.salonId, cursoId });
		}
	}
	// #endregion

	// #region Helpers
	getNotaValue(notas: { calificacionId: number; nota: number | null }[], calificacionId: number): string {
		const nota = notas.find((n) => n.calificacionId === calificacionId);
		if (nota?.nota === null || nota?.nota === undefined) return '—';
		return formatNotaConConfig(nota.nota, this.calificacionConfig());
	}

	getPromedioValue(promedios: { periodo: string; promedio: number | null }[], periodoNombre: string): string {
		const p = promedios.find((pm) => pm.periodo === periodoNombre);
		if (p?.promedio === null || p?.promedio === undefined) return '—';
		return formatNotaConConfig(p.promedio, this.calificacionConfig());
	}

	getGeneralPromedio(promedios: { periodo: string; promedio: number | null }[]): string {
		const p = promedios.find((pm) => pm.periodo === 'General');
		if (p?.promedio === null || p?.promedio === undefined) return '—';
		return formatNotaConConfig(p.promedio, this.calificacionConfig());
	}

	/** Retorna clase CSS según la configuración de calificación del nivel */
	getNotaClass(notas: { calificacionId: number; nota: number | null }[], calificacionId: number): string {
		const nota = notas.find((n) => n.calificacionId === calificacionId);
		if (nota?.nota === null || nota?.nota === undefined) return 'nota-vacia';
		return isNotaAprobada(nota.nota, this.calificacionConfig()) ? 'nota-alta' : 'nota-baja';
	}

	getPromedioClass(promedios: { periodo: string; promedio: number | null }[], periodoNombre: string): string {
		const p = promedios.find((pm) => pm.periodo === periodoNombre);
		if (p?.promedio === null || p?.promedio === undefined) return 'nota-vacia';
		return isNotaAprobada(p.promedio, this.calificacionConfig()) ? 'nota-alta' : 'nota-baja';
	}

	getGeneralClass(promedios: { periodo: string; promedio: number | null }[]): string {
		const p = promedios.find((pm) => pm.periodo === 'General');
		if (p?.promedio === null || p?.promedio === undefined) return 'nota-vacia';
		return isNotaAprobada(p.promedio, this.calificacionConfig()) ? 'nota-alta' : 'nota-baja';
	}
	// #endregion
}
