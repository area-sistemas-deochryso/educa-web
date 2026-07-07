import { RuntimeHealthHistoryDto } from '../../models/runtime-health.models';

export interface MetricSummary {
	label: string;
	min: string;
	avg: string;
	max: string;
}

export interface ChartConfig {
	title: string;
	icon: string;
	canvasRef: string;
	summaries: MetricSummary[];
}

export interface CorrelationMetric {
	label: string;
	value: string;
	category: string;
}

export const CHART_COLORS = {
	blue: '#3b82f6',
	orange: '#f97316',
	green: '#22c55e',
	yellow: '#eab308',
	red: '#ef4444',
	purple: '#a855f7',
	teal: '#14b8a6',
	pink: '#ec4899',
} as const;

export function buildDataset(label: string, data: number[], color: string, yAxisID = 'y') {
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

export function formatTimestamp(ts: string): string {
	const d = new Date(ts);
	return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function metricSummary(label: string, values: number[], unit = ''): MetricSummary {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	const fmt = (n: number) => n.toFixed(n < 10 ? 1 : 0) + (unit ? ` ${unit}` : '');
	return { label, min: fmt(min), avg: fmt(avg), max: fmt(max) };
}

export function buildCorrelationMetrics(snap: RuntimeHealthHistoryDto): CorrelationMetric[] {
	const fmt = (n: number) => n.toFixed(1);
	return [
		{ category: 'ThreadPool', label: 'Workers busy', value: `${snap.threadPool.workersBusy} / ${snap.threadPool.workersMax}` },
		{ category: 'ThreadPool', label: 'Cola pendiente', value: `${snap.threadPool.queueLength}` },
		{ category: 'ThreadPool', label: 'IO busy', value: `${snap.threadPool.ioBusy} / ${snap.threadPool.ioMax}` },
		{ category: 'Requests', label: 'In-flight', value: `${snap.requests.inFlight}` },
		{ category: 'Requests', label: 'p50', value: `${fmt(snap.requests.p50Ms)} ms` },
		{ category: 'Requests', label: 'p95', value: `${fmt(snap.requests.p95Ms)} ms` },
		{ category: 'Requests', label: 'p99', value: `${fmt(snap.requests.p99Ms)} ms` },
		{ category: 'Requests', label: 'Últimos 5 min', value: `${snap.requests.last5MinCount}` },
		{ category: 'GC', label: 'Heap', value: `${fmt(snap.gc.heapMb)} MB` },
		{ category: 'GC', label: 'Gen0', value: `${snap.gc.gen0}` },
		{ category: 'GC', label: 'Gen1', value: `${snap.gc.gen1}` },
		{ category: 'GC', label: 'Gen2', value: `${snap.gc.gen2}` },
	];
}

export function computeSummaries(data: RuntimeHealthHistoryDto[]): ChartConfig[] {
	if (data.length === 0) return [];

	return [
		{
			title: 'ThreadPool',
			icon: 'pi pi-server',
			canvasRef: 'threadPoolChart',
			summaries: [
				metricSummary('Workers busy', data.map(d => d.threadPool.workersBusy)),
				metricSummary('Cola', data.map(d => d.threadPool.queueLength)),
			],
		},
		{
			title: 'Requests',
			icon: 'pi pi-bolt',
			canvasRef: 'requestsChart',
			summaries: [
				metricSummary('p50', data.map(d => d.requests.p50Ms), 'ms'),
				metricSummary('p95', data.map(d => d.requests.p95Ms), 'ms'),
				metricSummary('p99', data.map(d => d.requests.p99Ms), 'ms'),
			],
		},
		{
			title: 'GC',
			icon: 'pi pi-chart-bar',
			canvasRef: 'gcChart',
			summaries: [
				metricSummary('Heap', data.map(d => d.gc.heapMb), 'MB'),
				metricSummary('Gen2', data.map(d => d.gc.gen2)),
			],
		},
	];
}
