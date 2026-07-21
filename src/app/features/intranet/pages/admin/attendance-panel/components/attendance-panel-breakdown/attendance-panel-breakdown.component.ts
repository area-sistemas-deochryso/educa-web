import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	effect,
	input,
	output,
	viewChild,
} from '@angular/core';
import { ActiveElement, Chart, ChartEvent, Plugin, registerables } from 'chart.js';

import type { AttendancePanelBreakdownItem } from '../../models';
import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

Chart.register(...registerables);

// * Misma paleta que `attendance-panel-chart-line` (una por tipo de persona).
const COLORS: Record<string, string> = {
	E: '#6366f1',
	P: '#22c55e',
	A: '#f97316',
	C: '#0ea5e9',
	M: '#a855f7',
};

// * Anota el % al final de cada barra, derivado de la posición animada (ver `attendance-salones-summary`).
function buildBarValueLabelsPlugin(): Plugin<'bar'> {
	return {
		id: 'breakdownValueLabels',
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
				const animatedValue = Math.max(0, Math.round(scale.getValueForPixel(x) ?? 0));
				ctx.textAlign = 'left';
				ctx.fillText(`${animatedValue}%`, x + 8, y);
			});

			ctx.restore();
		},
	};
}

@Component({
	selector: 'app-attendance-panel-breakdown',
	standalone: true,
	templateUrl: './attendance-panel-breakdown.component.html',
	styleUrl: './attendance-panel-breakdown.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelBreakdownComponent implements OnDestroy {
	readonly items = input.required<AttendancePanelBreakdownItem[]>();

	readonly seleccionar = output<AttendancePanelBreakdownItem>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('breakdownChart');

	private chart: Chart | null = null;

	constructor() {
		// * El canvas puede no existir todavía en el primer tick (ver `attendance-salones-summary`
		// * para el detalle de por qué `viewChild()` se lee como señal reactiva acá).
		effect(() => {
			const canvas = this.chartCanvas()?.nativeElement;
			const items = this.items();
			if (!canvas) return;
			if (this.chart?.canvas !== canvas) {
				this.chart?.destroy();
				this.createChart(canvas);
			}
			this.updateChart(items);
		});
	}

	ngOnDestroy(): void {
		this.chart?.destroy();
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
				layout: { padding: { right: 52 } },
				scales: { x: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } },
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: { label: (ctx) => `${ctx.formattedValue}%` } },
				},
				onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
					const index = elements[0]?.index;
					const item = index !== undefined ? this.items()[index] : undefined;
					if (item) this.seleccionar.emit(item);
				},
				onHover: (event, elements) => {
					const target = event.native?.target as HTMLElement | undefined;
					if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
				},
			},
			plugins: [buildBarValueLabelsPlugin()],
		});
	}

	private updateChart(items: AttendancePanelBreakdownItem[]): void {
		const chart = this.chart;
		if (!chart) return;

		const labels = items.map((i) => i.label);
		const data = items.map((i) => i.porcentajeAsistencia);
		const colors = items.map((i) => COLORS[i.tipoPersona] ?? '#6366f1');

		// * Ver `attendance-panel-chart-dia` para el detalle del bug de `ResizeObserver`.
		chart.resize();

		// * Igual que en `attendance-salones-summary`: sembrar en 0 antes de animar el valor real
		// * evita que Chart.js pase de 0 a N barras de golpe (sin poder interpolar "desde dónde").
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
