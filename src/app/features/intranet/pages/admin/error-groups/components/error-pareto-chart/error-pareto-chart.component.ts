import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { ErrorGroupPareto, ErrorSeveridad } from '../../models';

Chart.register(...registerables);

const SEVERIDAD_COLOR_MAP: Record<ErrorSeveridad, string> = {
	CRITICAL: '#ef4444',
	ERROR: '#f97316',
	WARNING: '#3b82f6',
};

const CUMULATIVE_COLOR = '#22c55e';

/** Barras visibles en el chart — el % acumulado se calcula sobre el 100% de `items()`, no solo estas. */
const MAX_BARS = 20;

function truncateLabel(text: string, max = 32): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Pareto de priorización de grupos de error (brief 433, P68 F8.3): barras de
 * score compuesto (severidad × frecuencia × recencia) + línea de % acumulado
 * sobre eje secundario. Mismo patrón Chart.js directo que
 * `resource-stats-chart.component.ts` — sin `p-chart` wrapper.
 */
@Component({
	selector: 'app-error-pareto-chart',
	standalone: true,
	imports: [],
	templateUrl: './error-pareto-chart.component.html',
	styleUrl: './error-pareto-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorParetoChartComponent implements AfterViewInit {
	readonly items = input<ErrorGroupPareto[]>([]);
	readonly loading = input(false);

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('paretoChart');

	private chart: Chart | null = null;
	private initialized = false;

	/** % acumulado sobre el total real (`items()` completo), no solo las barras visibles. */
	private readonly cumulativePercents = computed<number[]>(() => {
		const data = this.items();
		const total = data.reduce((sum, g) => sum + g.score, 0);
		if (total === 0) return data.map(() => 0);
		let running = 0;
		return data.map((g) => {
			running += g.score;
			return (running / total) * 100;
		});
	});

	constructor() {
		effect(() => {
			const data = this.items();
			if (this.initialized) this.renderChart(data);
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		this.renderChart(this.items());
	}

	private renderChart(data: ErrorGroupPareto[]): void {
		this.destroyChart();
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas || data.length === 0) return;

		const visible = data.slice(0, MAX_BARS);
		const cumulative = this.cumulativePercents().slice(0, MAX_BARS);

		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--text-color-secondary').trim() || '#94a3b8';
		const gridColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--surface-300').trim() || '#e2e8f0';

		this.chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: visible.map((g) => truncateLabel(g.mensajeRepresentativo)),
				datasets: [
					{
						type: 'bar',
						label: 'Score',
						data: visible.map((g) => g.score),
						backgroundColor: visible.map((g) => SEVERIDAD_COLOR_MAP[g.severidad] ?? SEVERIDAD_COLOR_MAP.WARNING),
						yAxisID: 'y',
						order: 2,
					},
					{
						type: 'line',
						label: '% acumulado',
						data: cumulative,
						borderColor: CUMULATIVE_COLOR,
						backgroundColor: CUMULATIVE_COLOR,
						yAxisID: 'y1',
						tension: 0.2,
						pointRadius: 3,
						order: 1,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: textColor, boxWidth: 12, padding: 12 } },
					tooltip: {
						callbacks: {
							title: (items) => visible[items[0]?.dataIndex ?? 0]?.mensajeRepresentativo ?? '',
						},
					},
				},
				scales: {
					x: {
						ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
						grid: { display: false },
					},
					y: {
						beginAtZero: true,
						ticks: { color: textColor },
						grid: { color: gridColor },
						title: { display: true, text: 'Score', color: textColor },
					},
					y1: {
						type: 'linear',
						position: 'right',
						min: 0,
						max: 100,
						ticks: { color: textColor, callback: (v) => `${v}%` },
						grid: { drawOnChartArea: false },
						title: { display: true, text: '% acumulado', color: textColor },
					},
				},
			},
		});
	}

	private destroyChart(): void {
		this.chart?.destroy();
		this.chart = null;
	}
}
