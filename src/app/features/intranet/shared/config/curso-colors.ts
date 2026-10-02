// One color per course, identical for every role, derived from cursoId only.
// OKLCH with fixed chroma per theme and three lightness bands (picked by id):
// the hue spreads the courses and the band adds a second axis, so neighbours
// that land on close hues still differ. Every band holds white text >= 4.5:1.
// The output is always hex — consumers (darkenColor, inline styles) rely on it.

// #region Constants
interface ThemeTone {
	lightnessBands: readonly number[];
	chroma: number;
}

/** White text sits on top of the fill in both themes (`--white-color`). */
export const CURSO_TEXT_COLOR = '#FFFFFF';

// Top band is capped by white-text contrast (0.55 already drops to 4.6:1).
// Measured over ids 1..48 in windows of 20: closest pair OKLab distance 0.024
// with one band -> 0.046 with these three.
const LIGHT_TONE: ThemeTone = { lightnessBands: [0.4, 0.47, 0.54], chroma: 0.15 };
const DARK_TONE: ThemeTone = { lightnessBands: [0.4, 0.47, 0.54], chroma: 0.13 };

const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

// Hue arc (OKLCH degrees) skipped around semantic red (~25°) and green (~150°),
// so a course never reads as a status color (e.g. "caída" in Rendimiento).
const ARC_START = 44;
const ARC_LENGTH = 270;
const GREEN_ZONE_START = 125;
const GREEN_ZONE_WIDTH = 50;
// #endregion

// #region Color math
function srgbEncode(channel: number): number {
	const c = Math.min(1, Math.max(0, channel));
	return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function oklchToLinearRgb(lightness: number, chroma: number, hue: number): [number, number, number] {
	const rad = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(rad);
	const b = chroma * Math.sin(rad);
	const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
	const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
	const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

function inGamut(rgb: [number, number, number]): boolean {
	return rgb.every((c) => c >= -0.0005 && c <= 1.0005);
}

/** Lowers chroma until the color fits sRGB, keeping lightness and hue untouched. */
function oklchToHex(lightness: number, chroma: number, hue: number): string {
	let c = chroma;
	let rgb = oklchToLinearRgb(lightness, c, hue);
	while (!inGamut(rgb) && c > 0) {
		c = Math.max(0, c - 0.005);
		rgb = oklchToLinearRgb(lightness, c, hue);
	}
	const hex = rgb
		.map((channel) =>
			Math.round(srgbEncode(channel) * 255)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('');
	return `#${hex.toUpperCase()}`;
}
// #endregion

// #region Public API
/** OKLCH hue (degrees) for a course: golden-angle spread over the allowed arc. */
export function cursoHueFor(cursoId: number): number {
	const t = (cursoId * GOLDEN_RATIO_CONJUGATE) % 1;
	let hue = ARC_START + t * ARC_LENGTH;
	if (hue >= GREEN_ZONE_START) hue += GREEN_ZONE_WIDTH;
	return hue % 360;
}

// Deterministic by cursoId — same course always gets the same color, regardless
// of which subset of horarios is loaded or in what order they arrive.
export function cursoColorFor(cursoId: number, dark = false): string {
	const tone = dark ? DARK_TONE : LIGHT_TONE;
	const lightness = tone.lightnessBands[Math.abs(cursoId) % tone.lightnessBands.length];
	return oklchToHex(lightness, tone.chroma, cursoHueFor(cursoId));
}

export function darkenColor(hex: string): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.max(0, (num >> 16) - 40);
	const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
	const b = Math.max(0, (num & 0x0000ff) - 40);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function buildCursoColorMap(
	items: { cursoId: number }[],
	dark = false,
): Map<number, string> {
	const map = new Map<number, string>();
	for (const item of items) {
		if (!map.has(item.cursoId)) {
			map.set(item.cursoId, cursoColorFor(item.cursoId, dark));
		}
	}
	return map;
}
// #endregion
