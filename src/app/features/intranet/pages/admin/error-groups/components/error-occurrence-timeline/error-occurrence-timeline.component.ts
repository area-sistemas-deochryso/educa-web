import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, Plugin, registerables } from 'chart.js';

Chart.register(...registerables);

const DEFAULT_POINT_COLOR = 'var(--text-color-secondary)';
const POINT_OPACITY = 0.5;
/** Bajo este span (ms) los ticks de solo-fecha caerían todos en el mismo día -- se agrega hora. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
/** Por encima de este alto (px) se muestran ticks en el eje X — debajo, el chart es compacto (tabla/kanban). */
const TICKS_VISIBLE_MIN_HEIGHT = 100;
const MARKER_DATASET_LABEL = 'Arranques';
/** Fallback si `--orange-400` no resuelve vía `getComputedStyle` (tema no cargado aún). */
const MARKER_LINE_COLOR = '#fb923c';

function withOpacity(color: string, alpha: number): string {
	// Colores en formato hex resuelto (getComputedStyle) o var() sin resolver — Chart.js acepta
	// rgba() directo, así que resolvemos hex a rgba; si no es hex, usamos el color tal cual.
	const hexMatch = /^#([0-9a-f]{6})$/i.exec(color.trim());
	if (!hexMatch) return color;
	const hex = hexMatch[1];
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface OccurrencePoint {
	x: number;
	y: number;
	/** Timestamp real de la ocurrencia (el `x` se snapea al centro del bin para el dot-histogram). */
	realTs: number;
}

/**
 * Timeline de ocurrencias individuales (brief actual, reemplazo de
 * `MiniSparklineComponent` en `error-groups`). Renderiza un dot-histogram
 * (Wilkinson): cada ocurrencia es un punto individual con su timestamp real
 * (click/tooltip por ocurrencia, como un scatter), pero se agrupan en bins
 * temporales y se apilan en Y -- la altura de la columna es el conteo exacto
 * del bin, como un histograma. En rangos dispersos (pocas ocurrencias por
 * bin) esto colapsa visualmente al scatter plano de antes; en bursts, la
 * altura hace evidente la magnitud que un scatter con y=0 fijo esconde por
 * overplotting. Mismo esqueleto Chart.js directo que `ErrorParetoChartComponent`
 * — sin adapter de fechas (no instalado), eje X `linear` con epoch ms.
 */
@Component({
	selector: 'app-error-occurrence-timeline',
	standalone: true,
	imports: [],
	templateUrl: './error-occurrence-timeline.component.html',
	styleUrl: './error-occurrence-timeline.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorOccurrenceTimelineComponent implements AfterViewInit {
	readonly data = input.required<readonly number[]>();
	readonly height = input<number>(32);
	readonly color = input<string>();
	readonly ariaLabel = input<string | undefined>(undefined);
	/**
	 * Timestamps epoch ms de arranques de proceso (proxy de deploy, brief
	 * 473/BE 474) — se dibujan como línea vertical + marcador con tooltip
	 * propio, superpuestos al scatter de ocurrencias.
	 */
	readonly markers = input<readonly number[]>([]);

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('timelineChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const values = this.data();
			const markers = this.markers();
			if (this.initialized) this.renderChart(values, markers);
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		this.renderChart(this.data(), this.markers());
	}

	private renderChart(values: readonly number[], markers: readonly number[]): void {
		this.destroyChart();
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		const resolvedColor =
			this.color() ||
			getComputedStyle(document.documentElement)
				.getPropertyValue('--text-color-secondary').trim() ||
			DEFAULT_POINT_COLOR;
		const pointColor = withOpacity(resolvedColor, POINT_OPACITY);
		const resolvedMarkerColor =
			getComputedStyle(document.documentElement).getPropertyValue('--orange-400').trim() ||
			MARKER_LINE_COLOR;
		const showTicks = this.height() > TICKS_VISIBLE_MIN_HEIGHT;
		const allTimestamps = [...values, ...markers];
		const span =
			allTimestamps.length > 1
				? Math.max(...allTimestamps) - Math.min(...allTimestamps)
				: 0;
		const sameDayRange = span < ONE_DAY_MS;
		const binWidthMs = sameDayRange ? ONE_MINUTE_MS : ONE_DAY_MS;

		const bins = new Map<number, number[]>();
		for (const ts of values) {
			const binStart = Math.floor(ts / binWidthMs) * binWidthMs;
			const bucket = bins.get(binStart);
			if (bucket) bucket.push(ts);
			else bins.set(binStart, [ts]);
		}
		let maxStack = 1;
		const occurrencePoints: OccurrencePoint[] = [];
		for (const [binStart, timestamps] of bins) {
			const binCenter = binStart + binWidthMs / 2;
			timestamps.forEach((realTs, i) => {
				occurrencePoints.push({ x: binCenter, y: i + 1, realTs });
			});
			maxStack = Math.max(maxStack, timestamps.length);
		}
		const markerRowY = maxStack + 1;

		const deployMarkerLinesPlugin: Plugin<'scatter'> = {
			id: 'deployMarkerLines',
			afterDatasetsDraw: (chart) => {
				if (markers.length === 0) return;
				const { ctx, chartArea, scales } = chart;
				const xScale = scales['x'];
				if (!chartArea || !xScale) return;
				ctx.save();
				ctx.strokeStyle = resolvedMarkerColor;
				ctx.lineWidth = 1;
				ctx.setLineDash([4, 3]);
				for (const ts of markers) {
					const x = xScale.getPixelForValue(ts);
					if (x < chartArea.left || x > chartArea.right) continue;
					ctx.beginPath();
					ctx.moveTo(x, chartArea.top);
					ctx.lineTo(x, chartArea.bottom);
					ctx.stroke();
				}
				ctx.restore();
			},
		};

		this.chart = new Chart(canvas, {
			type: 'scatter',
			data: {
				datasets: [
					{
						label: 'Ocurrencias',
						data: occurrencePoints,
						backgroundColor: pointColor,
						borderColor: pointColor,
						pointRadius: 3,
						showLine: false,
					},
					...(markers.length > 0
						? [
								{
									label: MARKER_DATASET_LABEL,
									data: markers.map((ts) => ({ x: ts, y: markerRowY })),
									backgroundColor: resolvedMarkerColor,
									borderColor: resolvedMarkerColor,
									pointStyle: 'triangle' as const,
									pointRadius: 5,
									showLine: false,
								},
							]
						: []),
				],
			},
			plugins: [deployMarkerLinesPlugin],
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const raw = ctx.raw as Partial<OccurrencePoint>;
								const rawTs = raw.realTs ?? Number(ctx.parsed.x);
								const fecha = new Date(rawTs).toLocaleString('es-AR');
								return ctx.dataset.label === MARKER_DATASET_LABEL
									? `Arranque de proceso: ${fecha}`
									: fecha;
							},
						},
					},
				},
				scales: {
					x: {
						type: 'linear',
						ticks: {
							display: showTicks,
							callback: (value) =>
								sameDayRange
									? new Date(Number(value)).toLocaleTimeString('es-AR', {
											hour: '2-digit',
											minute: '2-digit',
										})
									: new Date(Number(value)).toLocaleDateString('es-AR', {
											day: '2-digit',
											month: '2-digit',
										}),
						},
						grid: { display: showTicks },
					},
					y: {
						display: false,
						min: 0,
						max: markerRowY + 0.5,
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
