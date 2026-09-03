// #region Tipos de parseo

export interface SalonImportRow {
	fila: number;
	gradoId: number | null;
	seccionId: number | null;
	sedeId: number | null;
	anio: number | null;
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const SALON_COLUMN_MATCHERS: Record<string, string[]> = {
	gradoId: ['GRADOID', 'GRADO_ID', 'GRADO ID', 'GRADO'],
	seccionId: ['SECCIONID', 'SECCION_ID', 'SECCION ID', 'SECCIÓN', 'SECCION'],
	sedeId: ['SEDEID', 'SEDE_ID', 'SEDE ID', 'SEDE'],
	anio: ['ANIOESCOLAR', 'ANIO_ESCOLAR', 'ANIO ESCOLAR', 'AÑO', 'ANIO'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof SALON_COLUMN_MATCHERS): string | null {
	const matchers = SALON_COLUMN_MATCHERS[columnName];
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
