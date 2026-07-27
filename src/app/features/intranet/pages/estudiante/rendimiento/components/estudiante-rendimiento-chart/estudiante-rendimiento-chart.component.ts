import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	effect,
	input,
	viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { RendimientoPeriodoEstudianteDto } from '../../services/estudiante-rendimiento.models';

Chart.register(...registerables);

const NOTA_MAXIMA = 20;
const COLOR_MEJORA = '#22c55e';
const COLOR_CAIDA = '#ef4444';
const COLOR_NEUTRO = '#6366f1';

@Component({
	selector: 'app-estudiante-rendimiento-chart',
	standalone: true,
	templateUrl: './estudiante-rendimiento-chart.component.html',
	styleUrl: './estudiante-rendimiento-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstudianteRendimientoChartComponent implements AfterViewInit, OnDestroy {
	readonly periodos = input.required<RendimientoPeriodoEstudianteDto[]>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('rendimientoChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const value = this.periodos();
			if (this.initialized) this.updateChart(value);
		});
	}

	ngAfterViewInit(): void {
		this.createChart();
		this.initialized = true;
		this.updateChart(this.periodos());
	}

	ngOnDestroy(): void {
		this.chart?.destroy();
	}

	private createChart(): void {
		const canvas = this.chartCanvas()?.nativeElement;
		if (!canvas) return;

		this.chart = new Chart(canvas, {
			type: 'line',
			data: { labels: [], datasets: [] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const periodo = this.periodos()[ctx.dataIndex];
								const lineas = [`Promedio: ${ctx.parsed.y ?? '—'}`];
								if (periodo?.outlierVsPeriodoAnterior !== null && periodo?.outlierVsPeriodoAnterior !== undefined) {
									lineas.push(`vs. período anterior: ${formatDelta(periodo.outlierVsPeriodoAnterior)}`);
								}
								if (periodo?.outlierVsAnioAnterior !== null && periodo?.outlierVsAnioAnterior !== undefined) {
									lineas.push(`vs. año anterior: ${formatDelta(periodo.outlierVsAnioAnterior)}`);
								}
								return lineas;
							},
						},
					},
				},
				scales: {
					y: { min: 0, max: NOTA_MAXIMA },
				},
			},
		});
	}

	private updateChart(periodos: RendimientoPeriodoEstudianteDto[]): void {
		const chart = this.chart;
		if (!chart) return;

		chart.resize();

		chart.data.labels = periodos.map((p) => p.periodoNombre);
		chart.data.datasets = [
			{
				label: 'Promedio',
				data: periodos.map((p) => p.promedio),
				borderColor: COLOR_NEUTRO,
				backgroundColor: COLOR_NEUTRO,
				tension: 0.3,
				pointRadius: 4,
				pointBackgroundColor: periodos.map((p) => colorPorTendencia(p.outlierVsPeriodoAnterior)),
				spanGaps: true,
			},
		];
		chart.update();
	}
}

function colorPorTendencia(delta: number | null): string {
	if (delta === null) return COLOR_NEUTRO;
	if (delta > 0) return COLOR_MEJORA;
	if (delta < 0) return COLOR_CAIDA;
	return COLOR_NEUTRO;
}

function formatDelta(delta: number): string {
	const signo = delta > 0 ? '+' : '';
	return `${signo}${delta}`;
}
