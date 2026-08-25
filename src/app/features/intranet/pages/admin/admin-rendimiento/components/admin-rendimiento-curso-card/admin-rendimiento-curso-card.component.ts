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
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

import { ReporteRendimientoDto, tieneOutlier } from '../../models';
import { EduCard } from '@edu-ui';

Chart.register(...registerables);

const NOTA_MAXIMA = 20;
const COLOR_MEJORA = '#22c55e';
const COLOR_CAIDA = '#ef4444';
const COLOR_NEUTRO = '#6366f1';

/**
 * Card de un curso-contenido dentro del panel institucional. Clon del gráfico de línea de
 * `EstudianteRendimientoChartComponent` (brief 489/F4) adaptado a `RendimientoPeriodoDto`
 * (campo `promedioCurso` en vez de `promedio`), más el badge de outlier que es el
 * diferencial de valor de este panel (brief 495).
 */
@Component({
	selector: 'app-admin-rendimiento-curso-card',
	standalone: true,
	imports: [CommonModule, EduCard],
	templateUrl: './admin-rendimiento-curso-card.component.html',
	styleUrl: './admin-rendimiento-curso-card.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRendimientoCursoCardComponent implements AfterViewInit, OnDestroy {
	readonly curso = input.required<ReporteRendimientoDto>();

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('rendimientoChart');

	readonly hasOutlier = computed(() => tieneOutlier(this.curso()));

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const curso = this.curso();
			if (this.initialized) this.updateChart(curso);
		});
	}

	ngAfterViewInit(): void {
		this.createChart();
		this.initialized = true;
		this.updateChart(this.curso());
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
								const periodo = this.curso().periodos[ctx.dataIndex];
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

	private updateChart(curso: ReporteRendimientoDto): void {
		const chart = this.chart;
		if (!chart) return;

		chart.resize();

		const periodos = curso.periodos;
		chart.data.labels = periodos.map((p) => p.periodoNombre);
		chart.data.datasets = [
			{
				label: 'Promedio',
				data: periodos.map((p) => p.promedioCurso),
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
