import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnChanges,
	SimpleChanges,
	computed,
	effect,
	inject,
	input,
	output,
	viewChild,
	type ElementRef,
} from '@angular/core';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Chart, registerables } from 'chart.js';

import {
	HistoryTimeRange,
	RuntimeHealthHistoryDto,
	TIME_RANGE_OPTIONS,
} from '../../models/runtime-health.models';

Chart.register(...registerables);

interface MetricSummary {
	label: string;
	min: string;
	avg: string;
	max: string;
}

interface ChartConfig {
	title: string;
	icon: string;
	canvasRef: string;
	summaries: MetricSummary[];
}

@Component({
	selector: 'app-runtime-health-history',
	standalone: true,
	imports: [SelectButtonModule, FormsModule, ButtonModule, ProgressSpinnerModule],
	templateUrl: './runtime-health-history.component.html',
	styleUrl: './runtime-health-history.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthHistoryComponent implements AfterViewInit {
	// #region Inputs / Outputs
	readonly data = input<RuntimeHealthHistoryDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);
	readonly timeRange = input<HistoryTimeRange>('1h');

	readonly timeRangeChange = output<HistoryTimeRange>();
	readonly refresh = output<void>();
	// #endregion

	// #region Canvas refs
	readonly threadPoolCanvas = viewChild<ElementRef<HTMLCanvasElement>>('threadPoolChart');
	readonly requestsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('requestsChart');
	readonly dbCanvas = viewChild<ElementRef<HTMLCanvasElement>>('dbChart');
	readonly gcCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gcChart');
	// #endregion

	readonly rangeOptions = TIME_RANGE_OPTIONS;
	private charts: Chart[] = [];
	private initialized = false;

	readonly summaries = computed(() => this.computeSummaries(this.data()));

	constructor() {
		effect(() => {
			const d = this.data();
			if (this.initialized && d.length > 0) {
				this.updateCharts(d);
			}
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		const d = this.data();
		if (d.length > 0) {
			this.createCharts(d);
		}
	}

	onTimeRangeChange(value: HistoryTimeRange): void {
		this.timeRangeChange.emit(value);
	}

	onRefresh(): void {
		this.refresh.emit();
	}

	// #region Chart creation
	private createCharts(data: RuntimeHealthHistoryDto[]): void {
		this.destroyCharts();
		const labels = data.map(d => this.formatTimestamp(d.timestamp));
		const baseOpts = this.baseChartOptions();

		const tp = this.threadPoolCanvas()?.nativeElement;
		if (tp) {
			this.charts.push(new Chart(tp, {
				type: 'line',
				data: {
					labels,
					datasets: [
						this.dataset('Workers busy', data.map(d => d.threadPool.workersBusy), '--blue-500'),
						this.dataset('Cola pendiente', data.map(d => d.threadPool.queueLength), '--orange-500'),
					],
				},
				options: baseOpts,
			}));
		}

		const rq = this.requestsCanvas()?.nativeElement;
		if (rq) {
			this.charts.push(new Chart(rq, {
				type: 'line',
				data: {
					labels,
					datasets: [
						this.dataset('p50', data.map(d => d.requests.p50Ms), '--green-500'),
						this.dataset('p95', data.map(d => d.requests.p95Ms), '--yellow-500'),
						this.dataset('p99', data.map(d => d.requests.p99Ms), '--red-500'),
					],
				},
				options: {
					...baseOpts,
					scales: {
						...baseOpts.scales,
						y: { ...baseOpts.scales!['y'], title: { display: true, text: 'ms' } },
					},
				},
			}));
		}

		const db = this.dbCanvas()?.nativeElement;
		if (db) {
			this.charts.push(new Chart(db, {
				type: 'line',
				data: {
					labels,
					datasets: [
						this.dataset('Conexiones activas', data.map(d => d.db.activeConnections), '--blue-500', 'y'),
						this.dataset('p95 latencia', data.map(d => d.db.dbP95LatencyMs), '--red-500', 'y1'),
					],
				},
				options: {
					...baseOpts,
					scales: {
						...baseOpts.scales,
						y1: {
							type: 'linear',
							position: 'right',
							grid: { drawOnChartArea: false },
							title: { display: true, text: 'ms' },
						},
					},
				},
			}));
		}

		const gc = this.gcCanvas()?.nativeElement;
		if (gc) {
			this.charts.push(new Chart(gc, {
				type: 'line',
				data: {
					labels,
					datasets: [
						this.dataset('Heap', data.map(d => d.gc.heapMb), '--blue-500', 'y'),
						this.dataset('Gen0', data.map(d => d.gc.gen0), '--green-400', 'y1'),
						this.dataset('Gen1', data.map(d => d.gc.gen1), '--yellow-400', 'y1'),
						this.dataset('Gen2', data.map(d => d.gc.gen2), '--red-400', 'y1'),
					],
				},
				options: {
					...baseOpts,
					scales: {
						...baseOpts.scales,
						y: { ...baseOpts.scales!['y'], title: { display: true, text: 'MB' } },
						y1: {
							type: 'linear',
							position: 'right',
							grid: { drawOnChartArea: false },
							title: { display: true, text: 'Collections' },
						},
					},
				},
			}));
		}
	}

	private updateCharts(data: RuntimeHealthHistoryDto[]): void {
		if (this.charts.length === 0) {
			this.createCharts(data);
			return;
		}

		const labels = data.map(d => this.formatTimestamp(d.timestamp));
		const dataGroups = [
			[data.map(d => d.threadPool.workersBusy), data.map(d => d.threadPool.queueLength)],
			[data.map(d => d.requests.p50Ms), data.map(d => d.requests.p95Ms), data.map(d => d.requests.p99Ms)],
			[data.map(d => d.db.activeConnections), data.map(d => d.db.dbP95LatencyMs)],
			[data.map(d => d.gc.heapMb), data.map(d => d.gc.gen0), data.map(d => d.gc.gen1), data.map(d => d.gc.gen2)],
		];

		this.charts.forEach((chart, i) => {
			chart.data.labels = labels;
			dataGroups[i].forEach((values, j) => {
				if (chart.data.datasets[j]) {
					chart.data.datasets[j].data = values;
				}
			});
			chart.update('none');
		});
	}

	private destroyCharts(): void {
		this.charts.forEach(c => c.destroy());
		this.charts = [];
	}
	// #endregion

	// #region Helpers
	private dataset(label: string, data: number[], cssVar: string, yAxisID = 'y') {
		const color = getComputedStyle(document.documentElement)
			.getPropertyValue(cssVar).trim() || '#6366f1';
		return {
			label,
			data,
			borderColor: color,
			backgroundColor: color + '20',
			borderWidth: 1.5,
			pointRadius: 0,
			tension: 0.3,
			fill: false,
			yAxisID,
		};
	}

	private baseChartOptions(): Chart['options'] & Record<string, unknown> {
		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--text-color-secondary').trim() || '#94a3b8';
		const gridColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--surface-300').trim() || '#e2e8f0';
		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: 'index' as const, intersect: false },
			plugins: {
				legend: {
					labels: { color: textColor, boxWidth: 12, padding: 12 },
				},
			},
			scales: {
				x: {
					ticks: { color: textColor, maxTicksLimit: 10 },
					grid: { color: gridColor },
				},
				y: {
					ticks: { color: textColor },
					grid: { color: gridColor },
				},
			},
		};
	}

	private formatTimestamp(ts: string): string {
		const d = new Date(ts);
		return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
	}

	private computeSummaries(data: RuntimeHealthHistoryDto[]): ChartConfig[] {
		if (data.length === 0) return [];

		return [
			{
				title: 'ThreadPool',
				icon: 'pi pi-server',
				canvasRef: 'threadPoolChart',
				summaries: [
					this.metricSummary('Workers busy', data.map(d => d.threadPool.workersBusy)),
					this.metricSummary('Cola', data.map(d => d.threadPool.queueLength)),
				],
			},
			{
				title: 'Requests',
				icon: 'pi pi-bolt',
				canvasRef: 'requestsChart',
				summaries: [
					this.metricSummary('p50', data.map(d => d.requests.p50Ms), 'ms'),
					this.metricSummary('p95', data.map(d => d.requests.p95Ms), 'ms'),
					this.metricSummary('p99', data.map(d => d.requests.p99Ms), 'ms'),
				],
			},
			{
				title: 'BD',
				icon: 'pi pi-database',
				canvasRef: 'dbChart',
				summaries: [
					this.metricSummary('Conexiones', data.map(d => d.db.activeConnections)),
					this.metricSummary('p95 latencia', data.map(d => d.db.dbP95LatencyMs), 'ms'),
				],
			},
			{
				title: 'GC',
				icon: 'pi pi-chart-bar',
				canvasRef: 'gcChart',
				summaries: [
					this.metricSummary('Heap', data.map(d => d.gc.heapMb), 'MB'),
					this.metricSummary('Gen2', data.map(d => d.gc.gen2)),
				],
			},
		];
	}

	private metricSummary(label: string, values: number[], unit = ''): MetricSummary {
		const min = Math.min(...values);
		const max = Math.max(...values);
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		const fmt = (n: number) => n.toFixed(n < 10 ? 1 : 0) + (unit ? ` ${unit}` : '');
		return { label, min: fmt(min), avg: fmt(avg), max: fmt(max) };
	}
	// #endregion
}
