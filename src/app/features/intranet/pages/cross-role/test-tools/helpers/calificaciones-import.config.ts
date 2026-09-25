// #region Tipos de parseo

export interface NotaImportRow {
	fila: number;
	calificacionId: number | null;
	estudianteId: number | null;
	nota: number | null;
	observacion: string | null;
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const CALIFICACION_COLUMN_MATCHERS: Record<string, string[]> = {
	calificacionId: ['CALIFICACIONID', 'CALIFICACION_ID', 'CALIFICACION ID', 'EVALUACIONID', 'EVALUACION_ID', 'EVALUACION'],
	estudianteId: ['ESTUDIANTEID', 'ESTUDIANTE_ID', 'ESTUDIANTE ID', 'ESTUDIANTE'],
	nota: ['NOTA'],
	observacion: ['OBSERVACION', 'OBSERVACIONES', 'COMENTARIO'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof CALIFICACION_COLUMN_MATCHERS): string | null {
	const matchers = CALIFICACION_COLUMN_MATCHERS[columnName];
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

/**
 * Parsea una nota decimal en rango 0.0-20.0 (mismo rango que valida el backend).
 * A diferencia de parseId, 0 es un valor valido — no se puede usar chequeo falsy.
 */
export function parseNota(value: unknown): number | null {
	if (value == null || value === '') return null;
	const num = Number(value);
	return !isNaN(num) && num >= 0 && num <= 20 ? num : null;
}

// #endregion
