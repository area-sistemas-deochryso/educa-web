// #region Types
export type NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria';

const NIVEL_ORDER: NivelEducativo[] = ['Inicial', 'Primaria', 'Secundaria'];
// #endregion

// #region Classification

/**
 * Detect the education level from a grade name.
 *
 * @param gradoNombre Grade name string.
 * @returns Level or null if not detected.
 * @example
 * detectarNivel('INICIAL 3 ANOS');
 */
export function detectarNivel(gradoNombre: string): NivelEducativo | null {
	const lower = gradoNombre
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');

	if (lower.includes('inicial') || lower.includes('anos')) return 'Inicial';
	if (lower.includes('primaria')) return 'Primaria';
	if (lower.includes('secundaria')) return 'Secundaria';

	return null;
}

/**
 * Determine which education levels are present in a list of grade names.
 *
 * @param grados Grade names.
 * @returns Levels in logical order.
 * @example
 * const niveles = determinarNiveles(['INICIAL 3 ANOS', 'PRIMARIA 1']);
 */
export function determinarNiveles(grados: string[]): NivelEducativo[] {
	const niveles = new Set<NivelEducativo>();

	for (const grado of grados) {
		const nivel = detectarNivel(grado);
		if (nivel) niveles.add(nivel);
	}

	return NIVEL_ORDER.filter((nivel) => niveles.has(nivel));
}

/**
 * Filter items by education level using their nombre property.
 *
 * @param items Items with nombre.
 * @param nivel Target level.
 * @returns Filtered items.
 * @example
 * const prim = filtrarPorNivel(items, 'Primaria');
 */
export function filtrarPorNivel<T extends { nombre: string }>(
	items: T[],
	nivel: NivelEducativo,
): T[] {
	return items.filter((item) => detectarNivel(item.nombre) === nivel);
}

/**
 * Check if a grade name belongs to a specific level.
 *
 * @param gradoNombre Grade name.
 * @param nivel Target level.
 * @returns True if it matches.
 * @example
 * const ok = esNivel('PRIMARIA 1', 'Primaria');
 */
export function esNivel(gradoNombre: string, nivel: NivelEducativo): boolean {
	return detectarNivel(gradoNombre) === nivel;
}

/**
 * Determine the education level from a numeric grade order.
 *
 * @param gradoOrden Numeric order (1-3 Inicial, 4-9 Primaria, 10+ Secundaria).
 * @returns The education level.
 * @example
 * determinarNivelPorOrden(2); // 'Inicial'
 * determinarNivelPorOrden(5); // 'Primaria'
 */
export function determinarNivelPorOrden(gradoOrden: number): NivelEducativo {
	if (gradoOrden >= 1 && gradoOrden <= 3) return 'Inicial';
	if (gradoOrden >= 4 && gradoOrden <= 9) return 'Primaria';
	return 'Secundaria';
}
// #endregion

// #region Visual Config

type NivelSeverity = 'info' | 'success' | 'warn';

export interface NivelVisualConfig {
	key: string;
	title: NivelEducativo;
	icon: string;
	tagClass: string;
	severity: NivelSeverity;
}

/** Visual config for each education level — single source of truth for icons, colors, severities. */
export const NIVEL_VISUAL_CONFIGS: Record<NivelEducativo, NivelVisualConfig> = {
	Inicial: { key: 'inicial', title: 'Inicial', icon: 'pi pi-star', tagClass: 'tag-info', severity: 'info' },
	Primaria: { key: 'primaria', title: 'Primaria', icon: 'pi pi-book', tagClass: 'tag-success', severity: 'success' },
	Secundaria: { key: 'secundaria', title: 'Secundaria', icon: 'pi pi-graduation-cap', tagClass: 'tag-warn', severity: 'warn' },
};

/** Ordered array of visual configs — use for data-driven rendering of nivel sections. */
export const NIVEL_VISUAL_LIST: NivelVisualConfig[] = NIVEL_ORDER.map((n) => NIVEL_VISUAL_CONFIGS[n]);
// #endregion

// #region Prefix Removal

const NIVEL_PREFIXES: Record<NivelEducativo, RegExp> = {
	Inicial: /INICIAL\s*/i,
	Primaria: /PRIMARIA\s*/i,
	Secundaria: /SECUNDARIA\s*/i,
};

/**
 * Remove the level prefix from a grade name.
 *
 * @param gradoNombre Grade name.
 * @returns Grade name without the level prefix.
 * @example
 * removeNivelPrefix('INICIAL 3 ANOS');
 */
export function removeNivelPrefix(gradoNombre: string): string {
	const nivel = detectarNivel(gradoNombre);
	if (!nivel) return gradoNombre;

	return gradoNombre.replace(NIVEL_PREFIXES[nivel], '').trim();
}
// #endregion
