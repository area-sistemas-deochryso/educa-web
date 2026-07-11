import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	effect,
	input,
	output,
	viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Chart, registerables } from 'chart.js';

import { ResourceStatsSnapshotDto } from '../../models/diagnostico-db.models';

Chart.register(...registerables);

const CHART_COLORS = {
	blue: '#3b82f6',
	orange: '#f97316',
	green: '#22c55e',
	red: '#ef4444',
} as const;

function buildDataset(label: string, data: { x: number; y: number }[], color: string) {
	return {
		label,
		data,
		borderColor: color,
		backgroundColor: color + '20',
		borderWidth: 1.5,
		pointRadius: 0,
		tension: 0.3,
		fill: false,
	};
}

function formatAxisTick(ms: number): string {
	return new Date(ms).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

const CHART_WINDOW_MS = 60 * 60 * 1000;

@Component({
	selector: 'app-resource-stats-chart',
	standalone: true,
	imports: [ButtonModule],
	templateUrl: './resource-stats-chart.component.html',
	styleUrl: './resource-stats-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceStatsChartComponent implements AfterViewInit {
	// #region Inputs / Outputs
	readonly data = input<ResourceStatsSnapshotDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();
	// #endregion

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('resourceChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const d = this.data();
			if (this.initialized && d.length > 0) this.updateChart(d);
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		const d = this.data();
		if (d.length > 0) this.createChart(d);
	}

	onRefresh(): void {
		this.refresh.emit();
	}

	private createChart(data: ResourceStatsSnapshotDto[]): void {
		this.destroyChart();
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--text-color-secondary').trim() || '#94a3b8';
		const gridColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--surface-300').trim() || '#e2e8f0';

		const toPoints = (values: (d: ResourceStatsSnapshotDto) => number) =>
			data.map((d) => ({ x: new Date(d.timestamp).getTime(), y: values(d) }));

		this.chart = new Chart(canvas, {
			type: 'line',
			data: {
				datasets: [
					buildDataset('CPU %', toPoints((d) => d.cpuPercent), CHART_COLORS.blue),
					buildDataset('Data IO %', toPoints((d) => d.dataIoPercent), CHART_COLORS.orange),
					buildDataset('Log Write %', toPoints((d) => d.logWritePercent), CHART_COLORS.red),
					buildDataset('Memoria %', toPoints((d) => d.memoryUsagePercent), CHART_COLORS.green),
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: textColor, boxWidth: 12, padding: 12 } },
				},
				scales: {
					x: {
						type: 'linear',
						min: Date.now() - CHART_WINDOW_MS,
						max: Date.now(),
						ticks: { color: textColor, maxTicksLimit: 10, callback: (v) => formatAxisTick(Number(v)) },
						grid: { color: gridColor },
					},
					y: {
						min: 0,
						max: 100,
						ticks: { color: textColor },
						grid: { color: gridColor },
						title: { display: true, text: '%', color: textColor },
					},
				},
			},
		});
	}

	private updateChart(data: ResourceStatsSnapshotDto[]): void {
		const canvasStale = this.chart != null && !this.chart.canvas?.isConnected;
		if (!this.chart || canvasStale) {
			this.createChart(data);
			return;
		}

		const toPoints = (values: (d: ResourceStatsSnapshotDto) => number) =>
			data.map((d) => ({ x: new Date(d.timestamp).getTime(), y: values(d) }));

		const values = [
			toPoints((d) => d.cpuPercent),
			toPoints((d) => d.dataIoPercent),
			toPoints((d) => d.logWritePercent),
			toPoints((d) => d.memoryUsagePercent),
		];
		values.forEach((v, i) => {
			if (this.chart!.data.datasets[i]) this.chart!.data.datasets[i].data = v;
		});

		const xScale = this.chart.options.scales!['x']!;
		xScale.min = Date.now() - CHART_WINDOW_MS;
		xScale.max = Date.now();

		this.chart.update('none');
	}

	private destroyChart(): void {
		this.chart?.destroy();
		this.chart = null;
	}
}
