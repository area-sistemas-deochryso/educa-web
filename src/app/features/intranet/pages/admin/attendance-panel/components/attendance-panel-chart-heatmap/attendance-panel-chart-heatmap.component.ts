import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { AttendancePanelSerie } from '../../models';

/**
 * Umbrales de color "semáforo" (bien/regular/mal) — mismos tokens PrimeNG (`--green-500`,
 * `--yellow-500`, `--red-500`) que usa `dashboard-resumen` (email-outbox-dashboard-dia) para
 * sus tiles de estado. Se reutiliza la convención en vez de inventar una paleta nueva.
 */
const UMBRAL_BIEN = 90;
const UMBRAL_REGULAR = 75;

export type HeatmapNivel = 'bien' | 'regular' | 'mal' | 'sin-datos';

interface HeatmapCelda {
	columnaIndex: number;
	etiquetaColumna: string;
	porcentaje: number;
	nivel: HeatmapNivel;
}

interface HeatmapFila {
	tipoPersona: string;
	label: string;
	celdas: HeatmapCelda[];
}

@Component({
	selector: 'app-attendance-panel-chart-heatmap',
	standalone: true,
	templateUrl: './attendance-panel-chart-heatmap.component.html',
	styleUrl: './attendance-panel-chart-heatmap.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelChartHeatmapComponent {
	/**
	 * Misma `series` que consume `attendance-panel-chart-line` — proviene de `tendencia`
	 * (BE `ReportesAsistencia/tendencia`), que en modo Mes agrega por SEMANA (4-5 puntos), no
	 * por día. No hay endpoint de un solo request ya cableado a este panel con granularidad
	 * diaria para el mes completo, así que el heatmap comparte esta misma serie semana×tipo
	 * en vez de agregar llamadas nuevas (ver `AttendancePanelService.getSeries`).
	 */
	readonly series = input.required<AttendancePanelSerie[]>();
	readonly titulo = input('Mapa de calor — asistencia (%) por tipo y semana');

	readonly columnas = computed(() => this.series()[0]?.puntos.map((p) => p.etiqueta) ?? []);

	readonly filas = computed<HeatmapFila[]>(() =>
		this.series().map((serie) => ({
			tipoPersona: serie.tipoPersona,
			label: serie.label,
			celdas: serie.puntos.map((punto, i) => ({
				columnaIndex: i,
				etiquetaColumna: punto.etiqueta,
				porcentaje: punto.porcentaje,
				nivel: this.calcularNivel(punto.porcentaje),
			})),
		})),
	);

	readonly sinDatos = computed(() => this.series().every((s) => s.puntos.length === 0));

	private calcularNivel(porcentaje: number): HeatmapNivel {
		if (porcentaje === null || porcentaje === undefined) return 'sin-datos';
		if (porcentaje >= UMBRAL_BIEN) return 'bien';
		if (porcentaje >= UMBRAL_REGULAR) return 'regular';
		return 'mal';
	}
}
