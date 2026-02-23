// #region Types
export type NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria';

const NIVEL_ORDER: NivelEducativo[] = ['Inicial', 'Primaria', 'Secundaria'];
// #endregion

// #region Classification

/**
 * Detecta el nivel educativo de un nombre de grado.
 * @example detectarNivel('INICIAL 3 AÑOS') → 'Inicial'
 * @example detectarNivel('PRIMARIA 1') → 'Primaria'
 * @example detectarNivel('SECUNDARIA IV') → 'Secundaria'
 */
export function detectarNivel(gradoNombre: string): NivelEducativo | null {
	const lower = gradoNombre.toLowerCase();

	if (lower.includes('inicial') || lower.includes('años')) return 'Inicial';
	if (lower.includes('primaria')) return 'Primaria';
	if (lower.includes('secundaria')) return 'Secundaria';

	return null;
}

/**
 * Determina los niveles educativos presentes en un array de nombres de grado.
 * Retorna en orden lógico: Inicial → Primaria → Secundaria.
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
 * Filtra un array de items con propiedad `nombre` por nivel educativo.
 */
export function filtrarPorNivel<T extends { nombre: string }>(
	items: T[],
	nivel: NivelEducativo,
): T[] {
	return items.filter((item) => detectarNivel(item.nombre) === nivel);
}

/**
 * Verifica si un nombre de grado pertenece a un nivel dado.
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
 * Remueve el prefijo de nivel de un nombre de grado.
 * @example removeNivelPrefix('INICIAL 3 AÑOS') → '3 AÑOS'
 * @example removeNivelPrefix('PRIMARIA 1') → '1'
 */
export function removeNivelPrefix(gradoNombre: string): string {
	const nivel = detectarNivel(gradoNombre);
	if (!nivel) return gradoNombre;

	return gradoNombre.replace(NIVEL_PREFIXES[nivel], '').trim();
}
// #endregion
