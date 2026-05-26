// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
// #endregion

// #region Types
/**
 * Geometría calculada del sparkline. Expuesta para que el spec pueda inspeccionar
 * el resultado sin parsear el SVG renderizado.
 */
export interface MiniSparklinePath {
	readonly d: string;
	readonly lastX: number;
	readonly lastY: number;
	readonly viewBoxWidth: number;
	readonly viewBoxHeight: number;
}
// #endregion

// #region Implementation
/**
 * Mini-sparkline 30d con SVG inline. Standalone + OnPush.
 *
 * Plan 43 Chat 1.2 — usado en cards de `ErrorGroup` para indicar si el bug
 * está activo, durmiendo o explotando. Sin ejes, sin labels — solo línea +
 * último punto destacado.
 *
 * Reglas:
 * - Si `data.length === 0` o todos los valores son `0`: render placeholder
 *   `"sin actividad"` (texto chico, color `--text-color-secondary`).
 * - El viewBox del SVG normaliza la altura al input `height` y la anchura a
 *   un valor proporcional fijo para que la línea se vea consistente entre
 *   cards con distinta cantidad de puntos.
 * - El color se aplica via CSS variable / hex literal del consumidor.
 * - `ariaLabel` opcional: si no se provee, se sintetiza uno desde la serie.
 */
@Component({
	selector: 'app-mini-sparkline',
	standalone: true,
	templateUrl: './mini-sparkline.component.html',
	styleUrl: './mini-sparkline.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniSparklineComponent {
	// #region Inputs
	readonly data = input.required<readonly number[]>();
	readonly height = input<number>(32);
	readonly color = input<string>('var(--text-color-secondary)');
	readonly ariaLabel = input<string | undefined>(undefined);
	// #endregion

	// #region Computed
	readonly hasData = computed(() => {
		const values = this.data();
		if (!values || values.length === 0) return false;
		return values.some((v) => v > 0);
	});

	readonly path = computed<MiniSparklinePath | null>(() => {
		const values = this.data();
		if (!values || values.length < 2 || !this.hasData()) return null;
		return buildPath(values, this.height());
	});

	readonly singlePoint = computed<MiniSparklinePath | null>(() => {
		const values = this.data();
		if (!values || values.length !== 1 || !this.hasData()) return null;
		return buildPath(values, this.height());
	});

	readonly effectiveAriaLabel = computed(() => {
		const provided = this.ariaLabel();
		if (provided) return provided;
		const values = this.data();
		if (!this.hasData()) return 'Sin actividad en los últimos 30 días';
		const total = values.reduce((acc, v) => acc + v, 0);
		return `Tendencia de ${values.length} días, ${total} ocurrencias totales`;
	});
	// #endregion
}

/**
 * Calcula el path SVG a partir de la serie. Pure por testabilidad.
 *
 * - El eje X se distribuye uniformemente en `[0, viewBoxWidth]`.
 * - El eje Y normaliza valores a `[height, 0]` (SVG invierte Y).
 * - Si todos los valores son iguales, la línea queda en el medio vertical.
 */
function buildPath(values: readonly number[], height: number): MiniSparklinePath {
	const viewBoxWidth = Math.max(values.length - 1, 1) * 4;
	const viewBoxHeight = height;
	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min;

	const points = values.map((value, index) => {
		const x = values.length === 1 ? viewBoxWidth / 2 : (index / (values.length - 1)) * viewBoxWidth;
		const y =
			range === 0
				? viewBoxHeight / 2
				: viewBoxHeight - ((value - min) / range) * viewBoxHeight;
		return { x, y };
	});

	const d =
		points.length === 1
			? `M ${points[0].x} ${points[0].y}`
			: 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');

	const last = points[points.length - 1];
	return { d, lastX: last.x, lastY: last.y, viewBoxWidth, viewBoxHeight };
}
// #endregion
