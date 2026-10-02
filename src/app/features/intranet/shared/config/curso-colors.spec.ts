import { describe, expect, it } from 'vitest';

import {
	CURSO_TEXT_COLOR,
	buildCursoColorMap,
	cursoColorFor,
	darkenColor,
} from './curso-colors';

// #region Helpers
const WCAG_AA_NORMAL_TEXT = 4.5;
const SAMPLE_IDS = Array.from({ length: 1000 }, (_, i) => i + 1);
// Semantic status colors from styles.scss (--red-500/600, --green-500/600).
const SEMANTIC_HEXES = ['#EF4444', '#DC2626', '#22C55E', '#16A34A'];
const MIN_HUE_DISTANCE_FROM_SEMANTIC = 15;

function toLinear(channel8bit: number): number {
	const c = channel8bit / 255;
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.replace('#', ''), 16);
	return [toLinear((n >> 16) & 255), toLinear((n >> 8) & 255), toLinear(n & 255)];
}

function relativeLuminance(hex: string): number {
	const [r, g, b] = linearRgb(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
	const [hi, lo] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function oklchHue(hex: string): number {
	const [r, g, b] = linearRgb(hex);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

function oklab(hex: string): [number, number, number] {
	const [r, g, b] = linearRgb(hex);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function colorDistance(hexA: string, hexB: string): number {
	const [a, b] = [oklab(hexA), oklab(hexB)];
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function hueDistance(a: number, b: number): number {
	const d = Math.abs(a - b) % 360;
	return Math.min(d, 360 - d);
}
// #endregion

describe('curso-colors', () => {
	it.each([
		['light', false],
		['dark', true],
	])('keeps white text >= 4.5:1 on every course color (%s)', (_label, dark) => {
		const ratios = SAMPLE_IDS.map((id) => contrastRatio(cursoColorFor(id, dark), CURSO_TEXT_COLOR));
		const min = Math.min(...ratios);
		// eslint-disable-next-line no-console -- measured figures are the evidence brief 745 asks to keep visible
		console.log(`[curso-colors] ${_label}: min contrast vs white = ${min.toFixed(2)}:1 over ${SAMPLE_IDS.length} ids`);
		expect(min).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
	});

	it.each([
		['light', false],
		['dark', true],
	])('never lands near a semantic red/green hue (%s)', (_label, dark) => {
		let closest = 360;
		for (const id of SAMPLE_IDS) {
			const hue = oklchHue(cursoColorFor(id, dark));
			for (const semantic of SEMANTIC_HEXES) {
				closest = Math.min(closest, hueDistance(hue, oklchHue(semantic)));
			}
		}
		// eslint-disable-next-line no-console -- measured figures are the evidence brief 745 asks to keep visible
		console.log(`[curso-colors] ${_label}: closest hue to a semantic color = ${closest.toFixed(1)}°`);
		expect(closest).toBeGreaterThanOrEqual(MIN_HUE_DISTANCE_FROM_SEMANTIC);
	});

	it('is deterministic and well-formed hex', () => {
		for (const id of SAMPLE_IDS) {
			expect(cursoColorFor(id)).toMatch(/^#[0-9A-F]{6}$/);
			expect(cursoColorFor(id, true)).toBe(cursoColorFor(id, true));
		}
	});

	it('gives the same course the same hue in light and dark', () => {
		for (const id of [1, 7, 23, 48]) {
			expect(hueDistance(oklchHue(cursoColorFor(id)), oklchHue(cursoColorFor(id, true)))).toBeLessThan(3);
		}
	});

	it('reports the tightest hue gap among 20 consecutive courses', () => {
		let worst = 360;
		for (let start = 1; start <= 48 - 19; start++) {
			const hues = Array.from({ length: 20 }, (_, i) => oklchHue(cursoColorFor(start + i)));
			for (let i = 0; i < hues.length; i++) {
				for (let j = i + 1; j < hues.length; j++) {
					worst = Math.min(worst, hueDistance(hues[i], hues[j]));
				}
			}
		}
		// eslint-disable-next-line no-console -- measured figures are the evidence brief 745 asks to keep visible
		console.log(`[curso-colors] tightest hue gap among any 20 consecutive ids in 1..48 = ${worst.toFixed(1)}°`);
		expect(worst).toBeGreaterThan(0);
	});

	it.each([
		['light', false],
		['dark', true],
	])('keeps 20 consecutive courses visibly apart in OKLab (%s)', (_label, dark) => {
		// One lightness band gave 0.024 here; three bands are what lifts it.
		let worst = Infinity;
		for (let start = 1; start <= 48 - 19; start++) {
			const colors = Array.from({ length: 20 }, (_, i) => cursoColorFor(start + i, dark));
			for (let i = 0; i < colors.length; i++) {
				for (let j = i + 1; j < colors.length; j++) {
					worst = Math.min(worst, colorDistance(colors[i], colors[j]));
				}
			}
		}
		// eslint-disable-next-line no-console -- measured figures are the evidence brief 750 asks to keep visible
		console.log(`[curso-colors] ${_label}: closest OKLab distance among any 20 consecutive ids = ${worst.toFixed(3)}`);
		expect(worst).toBeGreaterThan(0.04);
	});

	it('builds one entry per distinct course', () => {
		const map = buildCursoColorMap([{ cursoId: 3 }, { cursoId: 3 }, { cursoId: 5 }], true);
		expect([...map.keys()]).toEqual([3, 5]);
		expect(map.get(3)).toBe(cursoColorFor(3, true));
	});

	it('darkenColor shifts each channel down by 40 and floors at 0', () => {
		expect(darkenColor('#3B82F6')).toBe('#135ace');
		expect(darkenColor('#101010')).toBe('#000000');
	});
});
