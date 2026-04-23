import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmailDashboardPorHora } from '../../models/email-dashboard-dia.models';

// * Dimensiones del viewBox SVG — responsive via preserveAspectRatio="none"
const VIEW_W = 720;
const VIEW_H = 220;
const TRACK_H = 200;
const GAP = 2;
const BARS = 24;
// * Un segmento muestra su valor DENTRO solo si ocupa al menos esta altura en px (viewBox).
const SEGMENT_VALUE_MIN_H = 16;

interface SegmentGeom {
	visible: boolean;
	y: number;
	height: number;
	value: number;
	showValue: boolean;
	cy: number;
}

interface BarGeom {
	hora: number;
	horaLabel: string;
	enviados: number;
	fallidos: number;
	queLlegaronAlSmtp: number;
	total: number;
	hasData: boolean;
	x: number;
	cx: number;
	width: number;
	sent: SegmentGeom; // enviados (verde)
	pending: SegmentGeom; // delta queLlegaronAlSmtp - enviados (azul)
	failed: SegmentGeom; // fallidos (rojo)
	// * Total visual del stack (suma de las 3 alturas) para saber dónde
	// * poner el label "total" arriba cuando los segmentos son muy chicos.
	stackTop: number;
	topLabel: number; // enviados — se muestra encima de la barra si no cabe adentro
	showTopLabel: boolean;
}

@Component({
	selector: 'app-dashboard-chart-hora',
	standalone: true,
	templateUrl: './dashboard-chart-hora.component.html',
	styleUrl: './dashboard-chart-hora.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardChartHoraComponent {
	readonly data = input.required<EmailDashboardPorHora[]>();

	// Constantes expuestas al template
	readonly viewBox = `0 0 ${VIEW_W} ${VIEW_H}`;
	readonly viewW = VIEW_W;
	readonly viewH = VIEW_H;
	readonly trackH = TRACK_H;

	readonly gridY0 = 0;
	readonly gridYMid = TRACK_H / 2;
	readonly gridYBottom = TRACK_H;

	// #region Computed
	readonly buckets = computed(() => {
		const items = this.data();
		const by = new Map(items.map((h) => [h.hora, h]));
		const out: EmailDashboardPorHora[] = [];
		for (let h = 0; h < BARS; h++) {
			out.push(
				by.get(h) ?? {
					hora: h,
					enviados: 0,
					fallidos: 0,
					queLlegaronAlSmtp: 0,
				},
			);
		}
		return out;
	});

	// * Max visual = enviados + fallidos + delta (lo que se apila realmente).
	readonly maxValue = computed(() => {
		const items = this.buckets();
		return Math.max(
			1,
			...items.map((d) => {
				const delta = Math.max(0, d.queLlegaronAlSmtp - d.enviados);
				return d.enviados + d.fallidos + delta;
			}),
		);
	});

	readonly midValue = computed(() => Math.round(this.maxValue() / 2));

	readonly sinDatos = computed(() => {
		const items = this.buckets();
		return items.every((d) => d.enviados + d.fallidos + d.queLlegaronAlSmtp === 0);
	});

	readonly horaActualLima = computed(() => {
		const now = new Date();
		const limaMs = now.getTime() + (now.getTimezoneOffset() - 300) * 60_000;
		return new Date(limaMs).getUTCHours();
	});

	readonly horaActualX = computed(() => {
		const h = this.horaActualLima();
		const slot = VIEW_W / BARS;
		return (h + 1) * slot;
	});

	readonly bars = computed<BarGeom[]>(() => {
		const items = this.buckets();
		const max = this.maxValue();
		const slot = VIEW_W / BARS;
		const barW = slot - GAP;
		const scale = TRACK_H / max;

		return items.map((d, i) => {
			const delta = Math.max(0, d.queLlegaronAlSmtp - d.enviados);
			const stackTotal = d.enviados + d.fallidos + delta;

			const hSent = d.enviados > 0 ? Math.max(3, d.enviados * scale) : 0;
			const hPending = delta > 0 ? Math.max(3, delta * scale) : 0;
			const hFailed = d.fallidos > 0 ? Math.max(4, d.fallidos * scale) : 0;

			// Apilado desde el fondo: verde → azul (delta) → rojo
			const ySent = TRACK_H - hSent;
			const yPending = ySent - hPending;
			const yFailed = yPending - hFailed;

			const yTop = hFailed > 0 ? yFailed : hPending > 0 ? yPending : ySent;

			const x = i * slot + GAP / 2;

			const mkSegment = (
				value: number,
				h: number,
				y: number,
			): SegmentGeom => ({
				visible: h > 0,
				y,
				height: h,
				value,
				showValue: h >= SEGMENT_VALUE_MIN_H,
				cy: y + h / 2,
			});

			const sent = mkSegment(d.enviados, hSent, ySent);
			const pending = mkSegment(delta, hPending, yPending);
			const failed = mkSegment(d.fallidos, hFailed, yFailed);

			// Si el segmento verde NO puede mostrar su valor adentro, lo sacamos
			// arriba del stack para que igual se lea.
			const showTopLabel = d.enviados > 0 && !sent.showValue;

			return {
				hora: d.hora,
				horaLabel: String(d.hora).padStart(2, '0'),
				enviados: d.enviados,
				fallidos: d.fallidos,
				queLlegaronAlSmtp: d.queLlegaronAlSmtp,
				total: stackTotal,
				hasData: d.enviados + d.fallidos + d.queLlegaronAlSmtp > 0,
				x,
				cx: x + barW / 2,
				width: barW,
				sent,
				pending,
				failed,
				stackTop: yTop,
				topLabel: d.enviados,
				showTopLabel,
			};
		});
	});
	// #endregion
}
