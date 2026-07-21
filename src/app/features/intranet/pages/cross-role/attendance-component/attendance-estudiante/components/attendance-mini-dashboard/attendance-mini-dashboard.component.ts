// #region Imports
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	computed,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, Plugin, registerables } from 'chart.js';

import { StatusCounts } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

Chart.register(...registerables);

// * Mismos colores que `attendance-legend.component.scss` — una sola paleta por estado.
const CHART_COLORS: Record<'A' | 'T' | 'F' | 'J', string> = {
	A: '#77a02d',
	T: '#ffcc0c',
	F: '#f44336',
	J: '#9c27b0',
};

const CHART_LABELS: Record<'A' | 'T' | 'F' | 'J', string> = {
	A: 'Asistió',
	T: 'Tardanza',
	F: 'Falta',
	J: 'Justificado',
};

// * Dibuja el % de asistencia en el hueco del donut (técnica "center text" vía `beforeDraw`).
// * Todos los arcos comparten misma duración/easing, así que la suma de sus `circumference`
// * animados crece de 0 a 2π seguiendo exactamente la misma curva — usamos esa fracción (0→1)
// * como progreso de la animación para hacer contar el % final de 0 al valor correcto, en vez de
// * ocultarlo y mostrarlo recién al terminar.
function buildCenterTextPlugin(getFinalPct: () => number): Plugin<'doughnut'> {
	return {
		id: 'centerText',
		beforeDraw(chart) {
			const { ctx, chartArea } = chart;
			const { left, right, top, bottom } = chartArea;
			const centerX = (left + right) / 2;
			const centerY = (top + bottom) / 2;

			const arcs = chart.getDatasetMeta(0).data;
			const circunferenciaTotal = arcs.reduce(
				(sum, arc) => sum + (arc.getProps(['circumference'], true)['circumference'] ?? 0),
				0,
			);
			const progreso = circunferenciaTotal / (2 * Math.PI);
			const animatedPct = Math.round(progreso * getFinalPct());

			ctx.save();
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = '700 1.5rem sans-serif';
			ctx.fillStyle = getComputedStyle(chart.canvas).getPropertyValue('--intranet-default-text-color') || '#333';
			ctx.fillText(`${animatedPct}%`, centerX, centerY - 8);

			ctx.font = '400 0.75rem sans-serif';
			ctx.fillStyle = getComputedStyle(chart.canvas).getPropertyValue('--intranet-alternative-text-color') || '#666';
			ctx.fillText('Asistencia', centerX, centerY + 14);
			ctx.restore();
		},
	};
}

// #endregion
// #region Implementation
@Component({
	selector: 'app-attendance-mini-dashboard',
	standalone: true,
	templateUrl: './attendance-mini-dashboard.component.html',
	styleUrl: './attendance-mini-dashboard.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceMiniDashboardComponent implements AfterViewInit, OnDestroy {
	// * Reutiliza `AttendanceTable.counts`/`grandTotal` ya calculados por `AttendanceDataService`.
	readonly counts = input.required<StatusCounts>();
	readonly grandTotal = input.required<string>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('miniDashboardChart');

	private chart: Chart | null = null;
	private initialized = false;

	readonly porcentajeAsistencia = computed(() => {
		const [attended, total] = this.grandTotal().split('/').map(Number);
		if (!total) return 0;
		return Math.round((attended / total) * 100);
	});

	constructor() {
		effect(() => {
			const value = this.counts();
			if (this.initialized) this.updateChart(value);
		});
	}

	ngAfterViewInit(): void {
		this.createChart();
		this.initialized = true;
		this.updateChart(this.counts());
	}

	ngOnDestroy(): void {
		this.chart?.destroy();
	}

	// * El chart se crea una sola vez, ya al tamaño final del contenedor y sin animación (aparece
	// * de golpe, sin "pop"/crecimiento). Los datos reales llegan después vía `updateChart()`, que
	// * sí anima — Chart.js interpola cada arco desde su valor visible actual hasta el nuevo. Ver
	// * `chats/running/` del brief 2026-07-21: los métodos con `new Chart(...)` diferido +
	// * `animation` desde la creación mostraban un salto de tamaño/forma perceptible al aparecer;
	// * este patrón (crear en 0, animar después) no.
	private createChart(): void {
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		const keys: ('A' | 'T' | 'F' | 'J')[] = ['A', 'T', 'F', 'J'];

		this.chart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: keys.map((key) => CHART_LABELS[key]),
				datasets: [
					{
						data: [0, 0, 0, 0],
						backgroundColor: keys.map((key) => CHART_COLORS[key]),
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '70%',
				animation: false,
				plugins: {
					legend: { position: 'bottom' },
				},
			},
			plugins: [buildCenterTextPlugin(() => this.porcentajeAsistencia())],
		});
	}

	private updateChart(counts: StatusCounts): void {
		const chart = this.chart;
		if (!chart) return;

		const keys: ('A' | 'T' | 'F' | 'J')[] = ['A', 'T', 'F', 'J'];
		chart.data.labels = keys.map((key) => `${CHART_LABELS[key]} (${counts[key]})`);
		chart.data.datasets[0].data = keys.map((key) => counts[key]);
		chart.options.animation = { duration: CHART_ANIMATION_DURATION_MS, easing: 'easeOutQuart' };
		chart.update();
	}
}
// #endregion
