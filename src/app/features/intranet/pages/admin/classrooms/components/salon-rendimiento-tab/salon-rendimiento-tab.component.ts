import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { HorarioResponseDto, ReporteRendimientoEstudiantesDto, RendimientoEstudianteDto } from '@data/models';

/** Nota mínima de deterioro para marcar a un estudiante "en riesgo" en su período más reciente */
const UMBRAL_RIESGO = 0;

@Component({
	selector: 'app-classroom-rendimiento-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule, TooltipModule],
	templateUrl: './salon-rendimiento-tab.component.html',
	styleUrl: './salon-rendimiento-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomRendimientoTabComponent {
	// #region Inputs / Outputs
	readonly rendimiento = input<ReporteRendimientoEstudiantesDto | null>(null);
	readonly loading = input(false);
	readonly error = input<string | null>(null);
	readonly horarios = input<HorarioResponseDto[]>([]);
	readonly horariosLoading = input(false);

	readonly cursoChange = output<{ salonId: number; cursoId: number }>();
	// #endregion

	// #region Estado local
	readonly selectedCursoId = signal<number | null>(null);
	// #endregion

	// #region Computed
	readonly cursoOptions = computed(() => {
		const horarios = this.horarios();
		const seen = new Set<number>();
		return horarios
			.filter((h) => {
				if (seen.has(h.cursoId)) return false;
				seen.add(h.cursoId);
				return true;
			})
			.map((h) => ({ label: h.cursoNombre, value: h.cursoId, salonId: h.salonId }));
	});

	/** Columnas de período: se toman del primer estudiante — el mismo cursoContenido comparte períodos entre todos */
	readonly periodoColumns = computed(() => {
		const data = this.rendimiento();
		const primero = data?.estudiantes[0];
		if (!primero) return [];
		return primero.periodos.map((p) => ({ periodoId: p.periodoId, periodoNombre: p.periodoNombre }));
	});

	readonly estudiantesEnRiesgo = computed(() => this.rendimiento()?.estudiantes.filter((e) => this.esEnRiesgo(e)).length ?? 0);
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

	// #region Helpers — celdas
	getPeriodo(estudiante: RendimientoEstudianteDto, periodoId: number) {
		return estudiante.periodos.find((p) => p.periodoId === periodoId) ?? null;
	}

	formatPromedio(promedio: number | null): string {
		return promedio === null ? '—' : promedio.toFixed(1);
	}

	formatDelta(delta: number | null): string {
		if (delta === null) return '';
		const signo = delta > 0 ? '+' : '';
		return `${signo}${delta.toFixed(1)}`;
	}

	deltaClass(delta: number | null): string {
		if (delta === null) return 'delta-neutro';
		if (delta < UMBRAL_RIESGO) return 'delta-caida';
		if (delta > UMBRAL_RIESGO) return 'delta-mejora';
		return 'delta-neutro';
	}
	// #endregion

	// #region Helpers — riesgo
	/** Un estudiante está "en riesgo" si en su período más reciente cayó respecto a su propia línea base (período anterior o año anterior) */
	esEnRiesgo(estudiante: RendimientoEstudianteDto): boolean {
		const ultimo = [...estudiante.periodos].sort((a, b) => b.periodoOrden - a.periodoOrden)[0];
		if (!ultimo) return false;
		return (
			(ultimo.outlierVsPeriodoAnterior !== null && ultimo.outlierVsPeriodoAnterior < UMBRAL_RIESGO) ||
			(ultimo.outlierVsAnioAnterior !== null && ultimo.outlierVsAnioAnterior < UMBRAL_RIESGO)
		);
	}
	// #endregion
}
