import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	input,
	output,
	viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartEvent, registerables } from 'chart.js';

import { ErrorSeveridad, HeatmapCalendarCell } from '../../models';

Chart.register(...registerables);

/** Espejo visual de `SEVERIDAD_SEVERITY_MAP` (danger/warn/info) en colores Chart.js. */
const SEVERIDAD_COLORS: Record<ErrorSeveridad, string> = {
	CRITICAL: '#ef4444',
	ERROR: '#f97316',
	WARNING: '#3b82f6',
};

const SEVERIDAD_LABELS: Record<ErrorSeveridad, string> = {
	CRITICAL: 'Critical',
	ERROR: 'Error',
	WARNING: 'Warning',
};

const SEVERIDAD_ORDER: ErrorSeveridad[] = ['CRITICAL', 'ERROR', 'WARNING'];

interface SeriesPoint {
	dates: string[];
	series: Record<ErrorSeveridad, number[]>;
}

export function buildSeries(cells: HeatmapCalendarCell[], startIso: string, endIso: string): SeriesPoint {
	const lookup = new Map<string, HeatmapCalendarCell>();
	for (const c of cells) lookup.set(c.date.slice(0, 10), c);

	const dates: string[] = [];
	const series: Record<ErrorSeveridad, number[]> = { CRITICAL: [], ERROR: [], WARNING: [] };

	const cursor = new Date(`${startIso}T00:00:00`);
	const end = new Date(`${endIso}T00:00:00`);
	while (cursor <= end) {
		const dateStr = cursor.toISOString().slice(0, 10);
		dates.push(dateStr);
		const cell = lookup.get(dateStr);
		for (const sev of SEVERIDAD_ORDER) {
			series[sev].push(cell?.countPorSeveridad?.[sev] ?? 0);
		}
		cursor.setDate(cursor.getDate() + 1);
	}

	return { dates, series };
}

function formatAxisTick(dateIso: string): string {
	const d = new Date(`${dateIso}T00:00:00`);
	return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
}

/**
 * Reemplazo del heatmap-calendario (grilla de celdas por color de intensidad) por un
 * area chart apilado por severidad (brief 472, P68 F10). Mismo endpoint BE
 * (`GET .../heatmap/calendar`), ahora con `countPorSeveridad` por celda.
 *
 * Drill-down equivalente al de la grilla anterior (brief 432, P68 F8.2): click en un
 * punto del timeline con `count > 0` para ese día emite `cellClick` con la fecha ISO.
 */
@Component({
	selector: 'app-error-heatmap-severity-chart',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './error-heatmap-severity-chart.component.html',
	styleUrl: './error-heatmap-severity-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorHeatmapSeverityChartComponent implements AfterViewInit {
	readonly cells = input<HeatmapCalendarCell[]>([]);
	readonly loading = input(false);
	readonly totalDays = input<7 | 30>(30);
	readonly endDate = input<Date | null>(null);

	/** Drill-down equivalente al de la grilla del heatmap-calendario (brief 432 P68 F8.2). */
	readonly cellClick = output<string>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('severityChart');

	private chart: Chart | null = null;
	private initialized = false;
	private dates: string[] = [];
	private countByDate = new Map<string, number>();

	readonly range = computed(() => {
		const days = this.totalDays();
		const end = this.endDate() ?? new Date();
		const start = new Date(end);
		start.setDate(start.getDate() - days + 1);
		return {
			startIso: start.toISOString().slice(0, 10),
			endIso: end.toISOString().slice(0, 10),
		};
	});

	readonly hasData = computed(() => this.cells().length > 0);

	constructor() {
		effect(() => {
			const cells = this.cells();
			const { startIso, endIso } = this.range();
			if (this.initialized && cells.length > 0) this.renderChart(cells, startIso, endIso);
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		const cells = this.cells();
		if (cells.length === 0) return;
		const { startIso, endIso } = this.range();
		this.renderChart(cells, startIso, endIso);
	}

	private renderChart(cells: HeatmapCalendarCell[], startIso: string, endIso: string): void {
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		const { dates, series } = buildSeries(cells, startIso, endIso);
		this.dates = dates;
		this.countByDate = new Map(
			dates.map((d, i) => [d, SEVERIDAD_ORDER.reduce((sum, sev) => sum + series[sev][i], 0)]),
		);

		if (this.chart && this.chart.canvas?.isConnected) {
			this.updateChart(dates, series);
			return;
		}

		this.destroyChart();

		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--p-text-muted-color').trim() || '#94a3b8';
		const gridColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--p-surface-200').trim() || '#e2e8f0';

		this.chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: dates,
				datasets: SEVERIDAD_ORDER.map((sev) => ({
					label: SEVERIDAD_LABELS[sev],
					data: series[sev],
					borderColor: SEVERIDAD_COLORS[sev],
					backgroundColor: `${SEVERIDAD_COLORS[sev]}55`,
					borderWidth: 1.5,
					pointRadius: 0,
					pointHitRadius: 8,
					tension: 0.2,
					fill: true,
					stack: 'severidad',
				})),
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: textColor, boxWidth: 12, padding: 12 } },
					tooltip: {
						callbacks: {
							title: (items) => formatAxisTick(String(items[0]?.label ?? '')),
						},
					},
				},
				scales: {
					x: {
						type: 'category',
						stacked: true,
						ticks: { color: textColor, maxTicksLimit: 12, callback: (_v, i) => formatAxisTick(dates[i]) },
						grid: { color: gridColor },
					},
					y: {
						stacked: true,
						beginAtZero: true,
						ticks: { color: textColor, precision: 0 },
						grid: { color: gridColor },
						title: { display: true, text: 'Errores', color: textColor },
					},
				},
				onClick: (event: ChartEvent) => this.handleClick(event),
			},
		});
	}

	private updateChart(dates: string[], series: Record<ErrorSeveridad, number[]>): void {
		if (!this.chart) return;
		this.chart.data.labels = dates;
		SEVERIDAD_ORDER.forEach((sev, i) => {
			if (this.chart!.data.datasets[i]) this.chart!.data.datasets[i].data = series[sev];
		});
		this.chart.update('none');
	}

	private handleClick(event: ChartEvent): void {
		if (!this.chart || event.native == null) return;
		const points = this.chart.getElementsAtEventForMode(
			event.native,
			'index',
			{ intersect: false },
			false,
		);
		const point = points[0];
		if (!point) return;
		const dateIso = this.dates[point.index];
		if (!dateIso) return;
		this.onPointClick(dateIso, this.countByDate.get(dateIso) ?? 0);
	}

	/**
	 * Gate del drill-down (equivalente a `onCalendarCellClick` de la grilla reemplazada,
	 * brief 432 P68 F8.2): un punto del timeline sin ocurrencias ese día no dispara filtro.
	 */
	onPointClick(dateIso: string, count: number): void {
		if (count === 0) return;
		this.cellClick.emit(dateIso);
	}

	private destroyChart(): void {
		this.chart?.destroy();
		this.chart = null;
	}
}
