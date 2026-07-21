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
import { Chart, registerables } from 'chart.js';

import type { AttendancePanelHoraBucket } from '../../models';
import { buildSweepRevealPlugin, cancelSweepReveal, triggerSweepReveal } from '../../utils/chart-sweep-reveal.util';
import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

// * Mismo patrón chart.js que `AttendancePanelChartLineComponent` — línea/área con 2 series
// * sobre el rango horario auto-acotado a los datos reales (la mayoría de las 24hs no tienen
// * marcaciones; mostrar las 24 desperdicia espacio horizontal, ver brief 2026-07-21).
Chart.register(...registerables);

const TOTAL_HORAS = 24;
const MARGEN_HORAS = 1;

const COLOR_A_TIEMPO = '#22c55e';
const COLOR_TARDE = '#f97316';

@Component({
	selector: 'app-attendance-panel-chart-dia',
	standalone: true,
	templateUrl: './attendance-panel-chart-dia.component.html',
	styleUrl: './attendance-panel-chart-dia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePanelChartDiaComponent implements AfterViewInit, OnDestroy {
	readonly data = input.required<AttendancePanelHoraBucket[]>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('panelDiaChart');

	private chart: Chart | null = null;
	private initialized = false;

	// #region Computed
	readonly buckets = computed(() => {
		const items = this.data();
		const by = new Map(items.map((h) => [h.hora, h]));
		const out: AttendancePanelHoraBucket[] = [];
		for (let h = 0; h < TOTAL_HORAS; h++) {
			out.push(by.get(h) ?? { hora: h, aTiempo: 0, tarde: 0 });
		}
		return out;
	});

	readonly maxValue = computed(() =>
		Math.max(1, ...this.buckets().map((d) => d.aTiempo + d.tarde)),
	);

	readonly sinDatos = computed(() => this.buckets().every((d) => d.aTiempo + d.tarde === 0));

	// Rango activo: primera-última hora con marcaciones, +/- 1h de margen, acotado a 0-23.
	// Evita graficar las 24hs cuando las llegadas se concentran en una ventana angosta (ej. 6-9am).
	readonly rangoHoras = computed(() => {
		const items = this.buckets();
		const horasConDatos = items.filter((d) => d.aTiempo > 0 || d.tarde > 0).map((d) => d.hora);
		if (horasConDatos.length === 0) return { desde: 0, hasta: TOTAL_HORAS - 1 };

		const desde = Math.max(0, Math.min(...horasConDatos) - MARGEN_HORAS);
		const hasta = Math.min(TOTAL_HORAS - 1, Math.max(...horasConDatos) + MARGEN_HORAS);
		return { desde, hasta };
	});

	readonly bucketsVisibles = computed(() => {
		const { desde, hasta } = this.rangoHoras();
		return this.buckets().filter((d) => d.hora >= desde && d.hora <= hasta);
	});
	// #endregion

	constructor() {
		effect(() => {
			const value = this.bucketsVisibles();
			if (this.initialized) this.updateChart(value);
		});
	}

	ngAfterViewInit(): void {
		this.createChart();
		this.initialized = true;
		this.updateChart(this.bucketsVisibles());
	}

	ngOnDestroy(): void {
		if (this.chart) cancelSweepReveal(this.chart);
		this.chart?.destroy();
	}

	// * Chart creado una sola vez, ya al tamaño final y sin animación — la entrada se anima con el
	// * "sweep" (recorrido de izquierda a derecha, ver `chart-sweep-reveal.util.ts`), no con la
	// * interpolación de valores de Chart.js.
	private createChart(): void {
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		this.chart = new Chart(canvas, {
			type: 'line',
			data: { labels: [], datasets: [] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: {
					legend: { position: 'bottom' },
					tooltip: {
						callbacks: {
							label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
						},
					},
				},
				scales: {
					y: {
						min: 0,
						ticks: { precision: 0 },
					},
				},
			},
			plugins: [buildSweepRevealPlugin()],
		});
	}

	private updateChart(buckets: AttendancePanelHoraBucket[]): void {
		const chart = this.chart;
		if (!chart) return;

		// * `resize()` explícito: si el contenedor ya tenía su tamaño final cuando el canvas se montó
		// * (ej. al alternar Día/Semana, donde el `@if` swapea el componente sin que el contenedor
		// * cambie de tamaño), el `ResizeObserver` interno de Chart.js no dispara — nunca hay un
		// * cambio de tamaño que observar — y el canvas queda pegado en el default 300x150.
		chart.resize();

		chart.data.labels = buckets.map((d) => `${String(d.hora).padStart(2, '0')}:00`);
		chart.data.datasets = [
			{
				label: 'A tiempo',
				data: buckets.map((d) => d.aTiempo),
				borderColor: COLOR_A_TIEMPO,
				backgroundColor: `${COLOR_A_TIEMPO}33`,
				fill: true,
				tension: 0.3,
				pointRadius: 3,
			},
			{
				label: 'Tarde',
				data: buckets.map((d) => d.tarde),
				borderColor: COLOR_TARDE,
				backgroundColor: `${COLOR_TARDE}33`,
				fill: true,
				tension: 0.3,
				pointRadius: 3,
			},
		];
		chart.update('none');
		triggerSweepReveal(chart, CHART_ANIMATION_DURATION_MS);
	}
}
