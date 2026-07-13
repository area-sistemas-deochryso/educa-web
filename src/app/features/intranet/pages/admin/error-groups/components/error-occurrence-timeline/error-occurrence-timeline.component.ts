import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DEFAULT_POINT_COLOR = 'var(--text-color-secondary)';
const POINT_OPACITY = 0.5;
/** Por encima de este alto (px) se muestran ticks en el eje X — debajo, el chart es compacto (tabla/kanban). */
const TICKS_VISIBLE_MIN_HEIGHT = 100;

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

/**
 * Timeline/strip-plot de ocurrencias individuales (brief actual, reemplazo de
 * `MiniSparklineComponent` en `error-groups`). Grafica cada ocurrencia como un
 * punto en el eje temporal real (no agregación diaria) para detectar bursts
 * que un conteo por día esconde. Mismo esqueleto Chart.js directo que
 * `ErrorParetoChartComponent` — sin adapter de fechas (no instalado), eje X
 * `linear` con epoch ms.
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

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('timelineChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const values = this.data();
			if (this.initialized) this.renderChart(values);
		});
	}

	ngAfterViewInit(): void {
		this.initialized = true;
		this.renderChart(this.data());
	}

	private renderChart(values: readonly number[]): void {
		this.destroyChart();
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		const resolvedColor =
			this.color() ||
			getComputedStyle(document.documentElement)
				.getPropertyValue('--text-color-secondary').trim() ||
			DEFAULT_POINT_COLOR;
		const pointColor = withOpacity(resolvedColor, POINT_OPACITY);
		const showTicks = this.height() > TICKS_VISIBLE_MIN_HEIGHT;

		this.chart = new Chart(canvas, {
			type: 'scatter',
			data: {
				datasets: [
					{
						label: 'Ocurrencias',
						data: values.map((ts) => ({ x: ts, y: 0 })),
						backgroundColor: pointColor,
						borderColor: pointColor,
						pointRadius: 3,
						showLine: false,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => new Date(Number(ctx.parsed.x)).toLocaleString('es-AR'),
						},
					},
				},
				scales: {
					x: {
						type: 'linear',
						ticks: {
							display: showTicks,
							callback: (value) =>
								new Date(Number(value)).toLocaleDateString('es-AR', {
									day: '2-digit',
									month: '2-digit',
								}),
						},
						grid: { display: showTicks },
					},
					y: {
						display: false,
						min: -1,
						max: 1,
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
