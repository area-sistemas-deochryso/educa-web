import type { Chart, Plugin } from 'chart.js';

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

interface SweepState {
	progress: number;
	rafId: number | null;
}

const sweepStates = new WeakMap<Chart, SweepState>();

// * Revela el chart de izquierda a derecha recortando el canvas con un clip que crece en el
// * tiempo, en vez de interpolar el valor de cada punto — el pedido fue que el trazo "recorra" la
// * forma ya definitiva (con un punto que la va dibujando), no que los puntos salten a su posición
// * final. Requiere `animation: false` en el chart — el sweep es la única animación de entrada.
export function buildSweepRevealPlugin(): Plugin<'line'> {
	return {
		id: 'sweepReveal',
		beforeDatasetsDraw(chart) {
			const state = sweepStates.get(chart);
			const progress = state?.progress ?? 1;
			const { left, top, width, height } = chart.chartArea;
			const clipWidth = Math.max(0, width * progress);

			chart.ctx.save();
			chart.ctx.beginPath();
			chart.ctx.rect(left, top - 4, clipWidth, height + 8);
			chart.ctx.clip();
		},
		afterDatasetsDraw(chart) {
			chart.ctx.restore();

			const state = sweepStates.get(chart);
			if (!state || state.progress >= 1) return;

			const { left, width } = chart.chartArea;
			const edgeX = left + width * state.progress;

			chart.ctx.save();
			chart.data.datasets.forEach((dataset, datasetIndex) => {
				const meta = chart.getDatasetMeta(datasetIndex);
				if (meta.hidden || meta.type !== 'line') return;

				const points = meta.data;
				if (points.length < 2) return;

				let i = 0;
				while (i < points.length - 1 && points[i + 1].x < edgeX) i++;
				const a = points[i];
				const b = points[i + 1] ?? a;
				const span = b.x - a.x;
				const t = span > 0 ? Math.min(1, Math.max(0, (edgeX - a.x) / span)) : 0;
				const y = a.y + (b.y - a.y) * t;

				chart.ctx.fillStyle = typeof dataset.borderColor === 'string' ? dataset.borderColor : '#333';
				chart.ctx.beginPath();
				chart.ctx.arc(edgeX, y, 4, 0, Math.PI * 2);
				chart.ctx.fill();
			});
			chart.ctx.restore();
		},
	};
}

export function triggerSweepReveal(chart: Chart, durationMs: number): void {
	cancelSweepReveal(chart);

	const state: SweepState = { progress: 0, rafId: null };
	sweepStates.set(chart, state);

	const start = performance.now();
	const step = (now: number) => {
		const t = Math.min(1, (now - start) / durationMs);
		state.progress = easeOutQuart(t);
		chart.draw();
		state.rafId = t < 1 ? requestAnimationFrame(step) : null;
	};
	state.rafId = requestAnimationFrame(step);
}

export function cancelSweepReveal(chart: Chart): void {
	const state = sweepStates.get(chart);
	if (state?.rafId != null) cancelAnimationFrame(state.rafId);
}
