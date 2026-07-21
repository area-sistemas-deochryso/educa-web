// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	effect,
	inject,
	input,
	signal,
	viewChild,
} from '@angular/core';
import { Chart, Plugin, registerables } from 'chart.js';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';

import { AsistenciaDiaConEstadisticas, EstudianteAsistencia, SalonProfesor } from '@data/models';
import { AttendanceService } from '@intranet-shared/services';
import { VIEW_MODE, ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { CHART_ANIMATION_DURATION_MS } from '@intranet-shared/config/chart-animation.const';

Chart.register(...registerables);

// * Salón bajo el promedio del profesor en más de este umbral (puntos porcentuales) se marca como alerta.
const ALERTA_PUNTOS_BAJO_PROMEDIO = 10;

// * Promedio general del profesor por debajo de este piso se marca como alerta en el donut agregado.
const UMBRAL_ALERTA_PROMEDIO_GENERAL = 70;

const COLOR_NORMAL = '#6366f1';
const COLOR_ALERTA = '#f44336';
const COLOR_RESTO = '#e5e7eb';

// * "Center text" del donut de promedio (ver `attendance-mini-dashboard`). El % se deriva del
// `circumference` animado del arco, no del dato final, para que crezca en sincro con el anillo.
function buildPromedioCenterTextPlugin(): Plugin<'doughnut'> {
	return {
		id: 'promedioCenterText',
		beforeDraw(chart) {
			const { ctx, chartArea } = chart;
			const { left, right, top, bottom } = chartArea;
			const centerX = (left + right) / 2;
			const centerY = (top + bottom) / 2;

			const total = (chart.data.datasets[0].data as number[]).reduce((sum, v) => sum + v, 0);
			const arc = chart.getDatasetMeta(0).data[0];
			const { circumference } = arc.getProps(['circumference'], true);
			const animatedValue = total > 0 ? (circumference / (2 * Math.PI)) * total : 0;

			ctx.save();
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = '700 1.3rem sans-serif';
			ctx.fillStyle = getComputedStyle(chart.canvas).getPropertyValue('--intranet-default-text-color') || '#333';
			ctx.fillText(`${Math.round(animatedValue)}%`, centerX, centerY);
			ctx.restore();
		},
	};
}

// * Anota el % al final de cada barra (sin tarjetas aparte). El valor se deriva de la posición
// animada de la barra (vía la escala), no del dato final, para acompañar la entrance animation.
function buildBarValueLabelsPlugin(): Plugin<'bar'> {
	return {
		id: 'barValueLabels',
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

interface SalonAsistenciaResumen {
	salonId: number;
	nombreSalon: string;
	porcentaje: number;
	alerta: boolean;
}

// #endregion
// #region Implementation
/**
 * Mini-dashboard agregado de "Mis salones" — % de asistencia promedio del
 * profesor a través de todos sus salones, con alerta visual en los que
 * están significativamente por debajo del promedio.
 *
 * Excepción autorizada: hace una llamada HTTP por salón (mismo endpoint que
 * `loadEstudiantes`/`getAsistenciasGrado` en modo Mes, `getAsistenciaDia` en
 * modo Día) para poder agregar el rango activo sin depender de la vista de
 * un único salón seleccionado.
 */
@Component({
	selector: 'app-attendance-salones-summary',
	standalone: true,
	templateUrl: './attendance-salones-summary.component.html',
	styleUrl: './attendance-salones-summary.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceSalonesSummaryComponent implements OnDestroy {
	private readonly asistenciaService = inject(AttendanceService);

	readonly salones = input.required<SalonProfesor[]>();
	// * Rango activo del toggle superior de la página (Día/Mes) y su fecha de referencia.
	readonly viewMode = input<ViewMode>(VIEW_MODE.Mes);
	readonly fechaDia = input<Date>(new Date());

	readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('salonesChart');
	readonly promedioChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('promedioChart');

	readonly loading = signal(false);
	readonly resumenes = signal<SalonAsistenciaResumen[]>([]);
	readonly promedioGeneral = signal(0);

	private chart: Chart | null = null;
	private promedioChart: Chart | null = null;
	private lastKey = '';

	constructor() {
		effect(() => {
			const salones = this.salones();
			const viewMode = this.viewMode();
			const fechaDia = this.fechaDia();
			const salonIds = salones.map((s) => s.salonId).join(',');
			const fechaKey = viewMode === VIEW_MODE.Dia ? fechaDia.toDateString() : '';
			const key = `${salonIds}|${viewMode}|${fechaKey}`;
			// * Evitar recargar cuando los inputs cambian de referencia pero no de contenido.
			if (key === this.lastKey) return;
			this.lastKey = key;
			this.loadResumenes(salones, viewMode, fechaDia);
		});

		// * El canvas vive detrás de `@if (!loading() && resumenes().length > 0)` en el template
		// * (no existe todavía cuando `loading()` es true), así que `viewChild()` — que es un signal —
		// * puede resolverse recién bastante después del mount inicial del componente, incluso en el
		// * mismo tick en que llegan los datos reales. Por eso cada efecto lee AMBAS señales (canvas +
		// * dato) — si el efecto solo dependiera del dato, un cambio de dato que llega antes de que el
		// * canvas exista se pierde para siempre (el chart nunca se crea después, ni se re-actualiza).
		// * Además, cada vez que `loading()` pasa por `true` (ej. al cambiar Día/Mes), el `@if` destruye
		// * y vuelve a crear el `<canvas>` — un elemento de DOM nuevo, aunque el componente en sí sigue
		// * vivo. Por eso se compara el elemento (no solo su existencia): si cambió, el chart viejo
		// * (atado al canvas destruido) se descarta y se crea uno nuevo sobre el canvas actual.
		effect(() => {
			const canvas = this.chartCanvas()?.nativeElement;
			const resumenes = this.resumenes();
			if (!canvas) return;
			if (this.chart?.canvas !== canvas) {
				this.chart?.destroy();
				this.createChart(canvas);
			}
			this.updateChart(resumenes);
		});

		effect(() => {
			const canvas = this.promedioChartCanvas()?.nativeElement;
			const promedio = this.promedioGeneral();
			if (!canvas) return;
			if (this.promedioChart?.canvas !== canvas) {
				this.promedioChart?.destroy();
				this.createPromedioChart(canvas);
			}
			this.updatePromedioChart(promedio);
		});
	}

	ngOnDestroy(): void {
		this.chart?.destroy();
		this.promedioChart?.destroy();
	}

	// * Chart creado una sola vez, ya al tamaño final y sin animación — evita el "pop" de aparición.
	// * Los datos reales entran vía `updateChart()`, que sí anima (ver `attendance-mini-dashboard`).
	private createChart(canvas: HTMLCanvasElement): void {
		this.chart = new Chart(canvas, {
			type: 'bar',
			data: { labels: [], datasets: [{ data: [] }] },
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				// * Margen derecho para que el label de % no se corte cuando el valor es 100%.
				layout: { padding: { right: 52 } },
				scales: { x: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } },
				plugins: {
					legend: { display: false },
					tooltip: { callbacks: { label: (ctx) => `${ctx.formattedValue}%` } },
				},
			},
			plugins: [buildBarValueLabelsPlugin()],
		});
	}

	private updateChart(resumenes: SalonAsistenciaResumen[]): void {
		const chart = this.chart;
		if (!chart) return;

		const labels = resumenes.map((r) => r.nombreSalon);
		const data = resumenes.map((r) => r.porcentaje);
		const colors = resumenes.map((r) => (r.alerta ? COLOR_ALERTA : COLOR_NORMAL));

		// * La cantidad de salones (y por lo tanto de barras) se sabe recién cuando llegan los datos —
		// * a diferencia de los otros charts de asistencia, acá no se puede sembrar el N correcto de
		// * barras en 0 desde `createChart()`. Sin este paso intermedio, Chart.js pasa de 0 elementos a
		// * N de golpe y los crea directo en su posición final (sin poder interpolar "desde dónde"),
		// * lo que se ve como un salto/escalado en vez de barras creciendo desde el eje.
		chart.data.labels = labels;
		chart.data.datasets[0].data = data.map(() => 0);
		chart.data.datasets[0].backgroundColor = colors;
		chart.options.animation = false;
		chart.update();

		chart.data.datasets[0].data = data;
		chart.options.animation = { duration: CHART_ANIMATION_DURATION_MS, easing: 'easeOutQuart' };
		chart.update();
	}

	// * Donut compacto de 2 segmentos ("promedio" vs "resto hasta 100%") — a diferencia del donut de
	// `attendance-mini-dashboard.component.ts`, el dato de entrada ya es un % agregado, sin desglose.
	private createPromedioChart(canvas: HTMLCanvasElement): void {
		this.promedioChart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: ['Promedio', 'Resto'],
				datasets: [{ data: [0, 100], backgroundColor: [COLOR_NORMAL, COLOR_RESTO], borderWidth: 0 }],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '75%',
				animation: false,
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false },
				},
			},
			plugins: [buildPromedioCenterTextPlugin()],
		});
	}

	private updatePromedioChart(promedio: number): void {
		const chart = this.promedioChart;
		if (!chart) return;

		const alerta = promedio < UMBRAL_ALERTA_PROMEDIO_GENERAL;
		chart.data.datasets[0].data = [promedio, Math.max(0, 100 - promedio)];
		chart.data.datasets[0].backgroundColor = [alerta ? COLOR_ALERTA : COLOR_NORMAL, COLOR_RESTO];
		chart.options.animation = { duration: CHART_ANIMATION_DURATION_MS, easing: 'easeOutQuart' };
		chart.update();
	}

	private loadResumenes(salones: SalonProfesor[], viewMode: ViewMode, fechaDia: Date): void {
		if (salones.length === 0) {
			this.resumenes.set([]);
			this.promedioGeneral.set(0);
			return;
		}

		this.loading.set(true);

		if (viewMode === VIEW_MODE.Dia) {
			this.loadResumenesDia(salones, fechaDia);
		} else {
			this.loadResumenesMes(salones);
		}
	}

	private loadResumenesDia(salones: SalonProfesor[], fechaDia: Date): void {
		const requests = salones.reduce(
			(acc, salon) => {
				acc[salon.salonId] = this.asistenciaService
					.getAsistenciaDia(salon.grado, salon.seccion, fechaDia)
					.pipe(catchError(() => of(null)));
				return acc;
			},
			{} as Record<number, Observable<AsistenciaDiaConEstadisticas | null>>,
		);

		forkJoin(requests)
			.pipe(finalize(() => this.loading.set(false)))
			.subscribe((resultsBySalonId) => {
				this.aplicarResumenes(
					salones,
					salones.map((salon) => resultsBySalonId[salon.salonId]?.estudiantes ?? null),
				);
			});
	}

	private loadResumenesMes(salones: SalonProfesor[]): void {
		const now = new Date();
		const mes = now.getMonth() + 1;
		const anio = now.getFullYear();

		const requests = salones.reduce(
			(acc, salon) => {
				acc[salon.salonId] = this.asistenciaService
					.getAsistenciasGrado(salon.grado, salon.seccion, mes, anio)
					.pipe(catchError(() => of(null)));
				return acc;
			},
			{} as Record<number, Observable<EstudianteAsistencia[] | null>>,
		);

		forkJoin(requests)
			.pipe(finalize(() => this.loading.set(false)))
			.subscribe((resultsBySalonId) => {
				this.aplicarResumenes(
					salones,
					salones.map((salon) => resultsBySalonId[salon.salonId] ?? null),
				);
			});
	}

	private aplicarResumenes(
		salones: SalonProfesor[],
		estudiantesPorSalon: (EstudianteAsistencia[] | null)[],
	): void {
		const parciales = salones.map((salon, i) => {
			const estudiantes = estudiantesPorSalon[i];
			const porcentaje = estudiantes ? this.calcularPorcentajeAsistencia(estudiantes) : null;
			return { salon, porcentaje };
		});

		const validos = parciales.filter(
			(p): p is { salon: SalonProfesor; porcentaje: number } => p.porcentaje !== null,
		);
		const promedio = validos.length > 0
			? Math.round(validos.reduce((sum, p) => sum + p.porcentaje, 0) / validos.length)
			: 0;

		this.promedioGeneral.set(promedio);
		this.resumenes.set(
			validos.map(({ salon, porcentaje }) => ({
				salonId: salon.salonId,
				nombreSalon: salon.nombreSalon,
				porcentaje,
				alerta: promedio - porcentaje > ALERTA_PUNTOS_BAJO_PROMEDIO,
			})),
		);
	}

	private calcularPorcentajeAsistencia(estudiantes: { asistencias: { estadoIngreso: string }[] }[]): number {
		let asistidos = 0;
		let validos = 0;

		for (const estudiante of estudiantes) {
			for (const asistencia of estudiante.asistencias) {
				if (asistencia.estadoIngreso === '-' || asistencia.estadoIngreso === 'X') continue;
				validos++;
				if (asistencia.estadoIngreso !== 'F') asistidos++;
			}
		}

		if (!validos) return 0;
		return Math.round((asistidos / validos) * 100);
	}
}
// #endregion
