import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import type { AttendancePanelSerie } from '../../models';
import { buildSweepRevealPlugin, cancelSweepReveal, triggerSweepReveal } from '../../utils/chart-sweep-reveal.util';
import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

Chart.register(...registerables);

// Paleta estable por tipo de persona — mismo orden que `PANEL_TIPOS_PERSONA`.
const COLORS: Record<string, string> = {
	E: '#6366f1',
	P: '#22c55e',
	A: '#f97316',
	C: '#0ea5e9',
	M: '#a855f7',
};

@Component({
	selector: 'app-attendance-panel-chart-line',
	standalone: true,
	templateUrl: './attendance-panel-chart-line.component.html',
	styleUrl: './attendance-panel-chart-line.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelChartLineComponent implements AfterViewInit, OnDestroy {
	readonly series = input.required<AttendancePanelSerie[]>();
	readonly titulo = input('Asistencia (%) por tipo de persona');

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('panelLineChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const value = this.series();
			if (this.initialized) this.updateChart(value);
		});
	}

	ngAfterViewInit(): void {
		this.createChart();
		this.initialized = true;
		this.updateChart(this.series());
	}

	ngOnDestroy(): void {
		if (this.chart) cancelSweepReveal(this.chart);
		this.chart?.destroy();
	}

	// * Chart creado una sola vez, ya al tamaño final y sin animación — la entrada se anima con el
	// * "sweep" (recorrido de izquierda a derecha, ver `chart-sweep-reveal.util.ts`), no con la
	// * interpolación de valores de Chart.js.
	private createChart(): void {
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		this.chart = new Chart(canvas, {
			type: 'line',
			data: { labels: [], datasets: [] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: {
					legend: { position: 'bottom' },
					tooltip: {
						callbacks: {
							label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`,
						},
					},
				},
				scales: {
					y: {
						min: 0,
						max: 100,
						ticks: { callback: (value) => `${value}%` },
					},
				},
			},
			plugins: [buildSweepRevealPlugin()],
		});
	}

	private updateChart(series: AttendancePanelSerie[]): void {
		const chart = this.chart;
		if (!chart) return;

		// * `resize()` explícito: ver `attendance-panel-chart-dia` para el detalle de por qué el
		// * `ResizeObserver` interno de Chart.js no siempre corrige el tamaño default (300x150) al
		// * alternar Día/Semana/Mes.
		chart.resize();

		chart.data.labels = series[0]?.puntos.map((p) => p.etiqueta) ?? [];
		chart.data.datasets = series.map((serie) => ({
			label: serie.label,
			data: serie.puntos.map((p) => p.porcentaje),
			borderColor: COLORS[serie.tipoPersona] ?? '#6366f1',
			backgroundColor: COLORS[serie.tipoPersona] ?? '#6366f1',
			tension: 0.3,
			pointRadius: 3,
		}));
		chart.update('none');
		triggerSweepReveal(chart, CHART_ANIMATION_DURATION_MS);
	}
}
