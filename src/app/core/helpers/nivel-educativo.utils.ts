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
