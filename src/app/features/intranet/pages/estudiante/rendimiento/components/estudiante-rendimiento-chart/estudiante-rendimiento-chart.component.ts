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
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { BandaEscala, buildBandas, letraDePromedio } from '../../helpers/rendimiento-escala.helper';
import { RendimientoPeriodoEstudianteDto } from '../../services/estudiante-rendimiento.models';

Chart.register(...registerables);

const NOTA_MAXIMA = 20;
const COLOR_MEJORA = '#22c55e';
const COLOR_CAIDA = '#ef4444';
const COLOR_NEUTRO = '#6366f1';

// Fondos translúcidos: funcionan sobre claro y oscuro; la letra del eje (texto) es la señal principal, no el color.
const COLOR_BANDA: Record<BandaEscala['severity'], string> = {
	success: 'rgba(34, 197, 94, 0.14)',
	warn: 'rgba(245, 158, 11, 0.14)',
	danger: 'rgba(239, 68, 68, 0.14)',
};

@Component({
	selector: 'app-estudiante-rendimiento-chart',
	standalone: true,
	templateUrl: './estudiante-rendimiento-chart.component.html',
	styleUrl: './estudiante-rendimiento-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstudianteRendimientoChartComponent implements AfterViewInit, OnDestroy {
	readonly periodos = input.required<RendimientoPeriodoEstudianteDto[]>();
	readonly sinPeriodosConfigurados = input.required<boolean>();
	/** Escala del curso (INV-U06). `null` → eje numérico 0-20. */
	readonly escala = input<ConfiguracionCalificacionListDto | null>(null);

	readonly bandas = computed(() => buildBandas(this.escala()));
	readonly ariaLabel = computed(() => {
		const puntos = this.periodos()
			.filter((p) => p.promedio !== null)
			.map((p) => {
				const letra = letraDePromedio(p.promedio, this.escala());
				return `${p.periodoNombre}: ${letra ? `${letra} (${p.promedio})` : p.promedio}`;
			});
		return `Tendencia del promedio por periodo. ${puntos.join('; ')}`;
	});

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('rendimientoChart');

	private chart: Chart | null = null;
	private initialized = false;

	constructor() {
		effect(() => {
			const value = this.periodos();
			this.escala();
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

		const bandasPlugin: Plugin<'line'> = {
			id: 'bandasEscala',
			beforeDatasetsDraw: (chart) => {
				const bandas = this.bandas();
				const { ctx, chartArea, scales } = chart;
				const y = scales['y'];
				if (!chartArea || !y) return;
				ctx.save();
				for (const banda of bandas) {
					const top = y.getPixelForValue(banda.hasta);
					const bottom = y.getPixelForValue(banda.desde);
					ctx.fillStyle = COLOR_BANDA[banda.severity];
					ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
				}
				ctx.restore();
			},
		};

		this.chart = new Chart(canvas, {
			type: 'line',
			plugins: [bandasPlugin],
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
								const letra = letraDePromedio(ctx.parsed.y ?? null, this.escala());
								const lineas = [`Promedio: ${ctx.parsed.y ?? '—'}${letra ? ` (${letra})` : ''}`];
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
					y: {
						min: 0,
						max: NOTA_MAXIMA,
						// Con escala literal el eje muestra una letra por banda (centrada); con escala numérica, 0-20.
						afterBuildTicks: (scale) => {
							const bandas = this.bandas();
							if (bandas.length > 0) scale.ticks = bandas.map((b) => ({ value: b.centro }));
						},
						ticks: {
							callback: (value) => {
								const banda = this.bandas().find((b) => b.centro === value);
								return banda ? banda.letra : value;
							},
						},
						grid: { drawOnChartArea: true },
					},
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
