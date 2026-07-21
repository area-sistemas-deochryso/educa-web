import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	computed,
	effect,
	input,
	output,
	viewChild,
} from '@angular/core';
import { ActiveElement, Chart, ChartEvent, Plugin, registerables } from 'chart.js';

import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

Chart.register(...registerables);

/** Sentido en que "subir" es una mejora — asistencia: sube=bien; ausencias/tardanzas: sube=mal. */
export type KpiTileSentido = 'positivo' | 'negativo';

const COLOR_MEJORA = '#22c55e';
const COLOR_PEOR = '#f44336';
const COLOR_NEUTRAL = '#6366f1';
const COLOR_ANTERIOR = '#e5e7eb';
const COLOR_TRACK = '#d1d5db';
const TRACK_HEIGHT_RATIO = 0.55;

// * Track (fondo) de cada barra — la franja completa 0→max, dibujada detrás de la barra real, para
// * que se note dónde termina la escala (como el riel de una progress bar) y no solo el segmento lleno.
function buildBarTrackPlugin(): Plugin<'bar'> {
	return {
		id: 'barTrack',
		beforeDatasetsDraw(chart) {
			const { ctx, chartArea } = chart;
			const meta = chart.getDatasetMeta(0);

			ctx.save();
			ctx.fillStyle = COLOR_TRACK;
			meta.data.forEach((bar) => {
				const { y, height } = bar.getProps(['y', 'height'], true);
				const trackHeight = height * TRACK_HEIGHT_RATIO;
				ctx.beginPath();
				ctx.roundRect(chartArea.left, y - trackHeight / 2, chartArea.width, trackHeight, trackHeight / 2);
				ctx.fill();
			});
			ctx.restore();
		},
	};
}

// * Anota el valor al final de cada barra (actual/anterior), derivado de su posición animada.
function buildKpiValueLabelsPlugin(sufijo: () => string): Plugin<'bar'> {
	return {
		id: 'kpiValueLabels',
		afterDatasetsDraw(chart) {
			const { ctx } = chart;
			const meta = chart.getDatasetMeta(0);
			const scale = chart.scales['x'];

			ctx.save();
			ctx.font = '700 0.8rem sans-serif';
			ctx.fillStyle = getComputedStyle(chart.canvas).getPropertyValue('--intranet-default-text-color') || '#333';
			ctx.textBaseline = 'middle';

			meta.data.forEach((bar) => {
				const { x, y } = bar.getProps(['x', 'y'], true);
				const animatedValue = Math.max(0, scale.getValueForPixel(x) ?? 0);
				ctx.textAlign = 'left';
				ctx.fillText(`${Math.round(animatedValue)}${sufijo()}`, x + 6, y);
			});

			ctx.restore();
		},
	};
}

@Component({
	selector: 'app-attendance-panel-kpi-tile',
	standalone: true,
	templateUrl: './attendance-panel-kpi-tile.component.html',
	styleUrl: './attendance-panel-kpi-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelKpiTileComponent implements OnDestroy {
	readonly label = input.required<string>();
	readonly valor = input.required<number>();
	readonly valorPrevio = input.required<number>();
	readonly sufijo = input('');
	readonly sentido = input<KpiTileSentido>('positivo');
	readonly icono = input('pi pi-chart-line');
	/** `false`: el dato no existe para el rango/filtro activo (ver `AttendancePanelKpis.conteosDisponibles`). */
	readonly disponible = input(true);
	/** `false`: el valor actual es real pero la comparación vs período anterior no (ver `comparacionDisponible`). */
	readonly comparacionDisponible = input(true);

	readonly activar = output<void>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('kpiChart');

	private chart: Chart | null = null;

	readonly delta = computed(() => this.valor() - this.valorPrevio());

	readonly esMejora = computed(() => {
		const d = this.delta();
		if (d === 0) return null;
		const subioEsMejora = this.sentido() === 'positivo';
		return subioEsMejora ? d > 0 : d < 0;
	});

	readonly deltaLabel = computed(() => {
		const d = this.delta();
		const signo = d > 0 ? '+' : '';
		return `${signo}${d}${this.sufijo()}`;
	});

	constructor() {
		// * El canvas vive detrás de `@if (disponible())` — ver `attendance-salones-summary` para el
		// * detalle de por qué `viewChild()` se lee como señal reactiva junto con los datos.
		effect(() => {
			const canvas = this.chartCanvas()?.nativeElement;
			const valor = this.valor();
			const valorPrevio = this.valorPrevio();
			const comparacionDisponible = this.comparacionDisponible();
			const disponible = this.disponible();
			if (!canvas || !disponible) return;
			if (this.chart?.canvas !== canvas) {
				this.chart?.destroy();
				this.createChart(canvas);
			}
			this.updateChart(valor, comparacionDisponible ? valorPrevio : null);
		});
	}

	ngOnDestroy(): void {
		this.chart?.destroy();
	}

	onClick(): void {
		this.activar.emit();
	}

	private createChart(canvas: HTMLCanvasElement): void {
		this.chart = new Chart(canvas, {
			type: 'bar',
			data: { labels: [], datasets: [{ data: [] }] },
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				layout: { padding: { right: 44 } },
				scales: {
					x: {
						min: 0,
						max: this.sufijo() === '%' ? 100 : undefined,
						display: false,
					},
					y: { display: false },
				},
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: { label: (ctx) => `${ctx.formattedValue}${this.sufijo()}` } },
				},
				onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
					if (elements.length > 0) this.activar.emit();
				},
				onHover: (event, elements) => {
					const target = event.native?.target as HTMLElement | undefined;
					if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
				},
			},
			plugins: [buildBarTrackPlugin(), buildKpiValueLabelsPlugin(() => this.sufijo())],
		});
	}

	private updateChart(valor: number, valorPrevio: number | null): void {
		const chart = this.chart;
		if (!chart) return;

		chart.resize();

		const labels = valorPrevio === null ? ['Actual'] : ['Actual', 'Anterior'];
		const data = valorPrevio === null ? [valor] : [valor, valorPrevio];
		const color = this.esMejora() === null ? COLOR_NEUTRAL : this.esMejora() ? COLOR_MEJORA : COLOR_PEOR;
		const colors = valorPrevio === null ? [color] : [color, COLOR_ANTERIOR];

		chart.data.labels = labels;
		chart.data.datasets[0].data = data.map(() => 0);
		chart.data.datasets[0].backgroundColor = colors;
		chart.options.animation = false;
		chart.update();

		chart.data.datasets[0].data = data;
		chart.options.animation = { duration: CHART_ANIMATION_DURATION_MS, easing: 'easeOutQuart' };
		chart.update();
	}
}
