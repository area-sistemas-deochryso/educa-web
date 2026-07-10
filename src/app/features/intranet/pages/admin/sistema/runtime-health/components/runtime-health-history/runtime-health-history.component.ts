import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
	viewChild,
	type ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { Chart, registerables } from 'chart.js';

import {
	HistoryTimeRange,
	PATTERN_LABEL,
	PATTERN_SEVERITY,
	resolveTimeRange,
	RuntimeHealthHistoryDto,
	SaturationPattern,
	TIME_RANGE_OPTIONS,
} from '../../models/runtime-health.models';

import {
	CHART_COLORS,
	type CorrelationMetric,
	buildCorrelationMetrics,
	buildDataset,
	computeSummaries,
	formatAxisTick,
} from './history-chart.helpers';

Chart.register(...registerables);

@Component({
	selector: 'app-runtime-health-history',
	standalone: true,
	imports: [DatePipe, SelectButtonModule, FormsModule, ButtonModule, ProgressSpinnerModule, TagModule],
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
	readonly gcCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gcChart');
	// #endregion

	readonly rangeOptions = TIME_RANGE_OPTIONS;
	readonly selectedPointIndex = signal<number | null>(null);
	private charts: Chart[] = [];
	private initialized = false;

	readonly summaries = computed(() => computeSummaries(this.data()));

	readonly selectedSnapshot = computed(() => {
		const idx = this.selectedPointIndex();
		if (idx === null) return null;
		return this.data()[idx] ?? null;
	});

	readonly correlationMetrics = computed<CorrelationMetric[]>(() => {
		const snap = this.selectedSnapshot();
		return snap ? buildCorrelationMetrics(snap) : [];
	});

	readonly correlationCategories = computed(() => {
		const metrics = this.correlationMetrics();
		const cats = [...new Set(metrics.map(m => m.category))];
		return cats.map(c => ({ category: c, metrics: metrics.filter(m => m.category === c) }));
	});

	getPatternLabel(pattern: string): string {
		return PATTERN_LABEL[pattern as SaturationPattern] ?? pattern;
	}

	getPatternSeverity(pattern: string): 'success' | 'warn' | 'info' | 'danger' {
		return PATTERN_SEVERITY[pattern as SaturationPattern] ?? 'info';
	}

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
		this.selectedPointIndex.set(null);
		this.timeRangeChange.emit(value);
	}

	onRefresh(): void {
		this.selectedPointIndex.set(null);
		this.refresh.emit();
	}

	dismissCorrelation(): void {
		this.selectedPointIndex.set(null);
	}

	// #region Chart creation
	private toPoints(data: RuntimeHealthHistoryDto[], value: (d: RuntimeHealthHistoryDto) => number): { x: number; y: number }[] {
		return data.map(d => ({ x: new Date(d.timestamp).getTime(), y: value(d) }));
	}

	private createCharts(data: RuntimeHealthHistoryDto[]): void {
		this.destroyCharts();
		const baseOpts = this.baseChartOptions();

		const tp = this.threadPoolCanvas()?.nativeElement;
		if (tp) {
			this.charts.push(new Chart(tp, {
				type: 'line',
				data: {
					datasets: [
						buildDataset('Workers busy', this.toPoints(data, d => d.threadPool.workersBusy), CHART_COLORS.blue),
						buildDataset('Cola pendiente', this.toPoints(data, d => d.threadPool.queueLength), CHART_COLORS.orange),
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
					datasets: [
						buildDataset('p50', this.toPoints(data, d => d.requests.p50Ms), CHART_COLORS.green),
						buildDataset('p95', this.toPoints(data, d => d.requests.p95Ms), CHART_COLORS.yellow),
						buildDataset('p99', this.toPoints(data, d => d.requests.p99Ms), CHART_COLORS.red),
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

		const gc = this.gcCanvas()?.nativeElement;
		if (gc) {
			this.charts.push(new Chart(gc, {
				type: 'line',
				data: {
					datasets: [
						buildDataset('Heap', this.toPoints(data, d => d.gc.heapMb), CHART_COLORS.blue, 'y'),
						buildDataset('Gen0', this.toPoints(data, d => d.gc.gen0), CHART_COLORS.green, 'y1'),
						buildDataset('Gen1', this.toPoints(data, d => d.gc.gen1), CHART_COLORS.yellow, 'y1'),
						buildDataset('Gen2', this.toPoints(data, d => d.gc.gen2), CHART_COLORS.red, 'y1'),
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
		const canvasStale = this.charts.length > 0 && !this.charts[0].canvas?.isConnected;
		if (this.charts.length === 0 || canvasStale) {
			this.createCharts(data);
			return;
		}

		const dataGroups = [
			[this.toPoints(data, d => d.threadPool.workersBusy), this.toPoints(data, d => d.threadPool.queueLength)],
			[this.toPoints(data, d => d.requests.p50Ms), this.toPoints(data, d => d.requests.p95Ms), this.toPoints(data, d => d.requests.p99Ms)],
			[this.toPoints(data, d => d.gc.heapMb), this.toPoints(data, d => d.gc.gen0), this.toPoints(data, d => d.gc.gen1), this.toPoints(data, d => d.gc.gen2)],
		];

		const { from, to } = resolveTimeRange(this.timeRange());
		const fromMs = from.getTime();
		const toMs = to.getTime();

		this.charts.forEach((chart, i) => {
			const xScale = chart.options.scales?.['x'];
			if (xScale) {
				xScale.min = fromMs;
				xScale.max = toMs;
			}
			dataGroups[i].forEach((points, j) => {
				if (chart.data.datasets[j]) {
					chart.data.datasets[j].data = points;
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
	private baseChartOptions(): Chart['options'] & Record<string, unknown> {
		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--text-color-secondary').trim() || '#94a3b8';
		const gridColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--surface-300').trim() || '#e2e8f0';
		const { from, to } = resolveTimeRange(this.timeRange());
		const range = this.timeRange();
		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: 'index' as const, intersect: false },
			onClick: (_event: unknown, elements: { index: number }[]) => {
				if (elements.length > 0) {
					this.selectedPointIndex.set(elements[0].index);
				}
			},
			plugins: {
				legend: {
					labels: { color: textColor, boxWidth: 12, padding: 12 },
				},
			},
			scales: {
				x: {
					type: 'linear',
					min: from.getTime(),
					max: to.getTime(),
					ticks: {
						color: textColor,
						maxTicksLimit: 10,
						callback: (v: string | number) => formatAxisTick(Number(v), range),
					},
					grid: { color: gridColor },
				},
				y: {
					ticks: { color: textColor },
					grid: { color: gridColor },
				},
			},
		};
	}
	// #endregion
}
