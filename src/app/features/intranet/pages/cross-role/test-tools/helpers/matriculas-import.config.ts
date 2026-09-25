// #region Tipos de parseo

export interface MatriculaImportRow {
	fila: number;
	estudianteId: number | null;
	salonId: number | null;
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const MATRICULA_COLUMN_MATCHERS: Record<string, string[]> = {
	estudianteId: ['ESTUDIANTEID', 'ESTUDIANTE_ID', 'ESTUDIANTE ID', 'ESTUDIANTE'],
	salonId: ['SALONID', 'SALON_ID', 'SALON ID', 'SALON'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof MATRICULA_COLUMN_MATCHERS): string | null {
	const matchers = MATRICULA_COLUMN_MATCHERS[columnName];
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
 * Parsea un ID numerico entero positivo.
 */
export function parseId(value: unknown): number | null {
	if (value == null || value === '') return null;
	const num = Number(value);
	return !isNaN(num) && Number.isInteger(num) && num > 0 ? num : null;
}

// #endregion
