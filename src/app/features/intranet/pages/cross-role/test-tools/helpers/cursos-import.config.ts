// #region Tipos de parseo

export interface CursoImportRow {
	fila: number;
	nombre: string;
	gradosIds: number[];
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const CURSO_COLUMN_MATCHERS: Record<string, string[]> = {
	nombre: ['NOMBRE', 'CURSO', 'NOMBRECURSO'],
	gradosIds: ['GRADOSIDS', 'GRADOS_IDS', 'GRADOS IDS', 'GRADOS', 'GRADOIDS', 'GRADO_IDS', 'GRADO IDS'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof CURSO_COLUMN_MATCHERS): string | null {
	const matchers = CURSO_COLUMN_MATCHERS[columnName];
	for (const key of keys) {
		const normalized = key.toUpperCase().replace(/\s+/g, '').replace(/_/g, '');
		for (const matcher of matchers) {
			const normalizedMatcher = matcher.replace(/\s+/g, '').replace(/_/g, '');
			if (normalized === normalizedMatcher || normalized.includes(normalizedMatcher)) {
				return key;
			}
		}
	}
	return null;
}

/**
 * Parsea una celda con varios IDs de grado separados por coma o punto y coma.
 * Filtra valores no numericos o <= 0.
 */
export function parseGradosIds(value: unknown): number[] {
	if (value == null || value === '') return [];
	return String(value)
		.split(/[,;]/)
		.map((part) => Number(part.trim()))
		.filter((num) => !isNaN(num) && Number.isInteger(num) && num > 0);
}

// #endregion

// #region Validacion

export const CURSO_NOMBRE_MAX_LENGTH = 50;

// #endregion
