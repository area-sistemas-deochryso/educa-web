// #region Tipos de parseo

export interface UsuarioImportRow {
	fila: number;
	dni: string;
	nombres: string;
	apellidos: string;
	contrasena: string;
	rol: string;
	sedeId: number | null;
	telefono: string | null;
	correo: string | null;
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const USUARIO_COLUMN_MATCHERS: Record<string, string[]> = {
	dni: ['DNI'],
	nombres: ['NOMBRES', 'NOMBRE'],
	apellidos: ['APELLIDOS', 'APELLIDO'],
	contrasena: ['CONTRASENA', 'CONTRASEÑA', 'PASSWORD', 'CLAVE'],
	rol: ['ROL'],
	sedeId: ['SEDEID', 'SEDE_ID', 'SEDE ID', 'SEDE'],
	telefono: ['TELEFONO', 'TELÉFONO', 'CELULAR'],
	correo: ['CORREO', 'EMAIL'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof USUARIO_COLUMN_MATCHERS): string | null {
	const matchers = USUARIO_COLUMN_MATCHERS[columnName];
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
 * Parsea un ID numerico entero positivo (SedeId es opcional — Apoderado no lo requiere).
 */
export function parseId(value: unknown): number | null {
	if (value == null || value === '') return null;
	const num = Number(value);
	return !isNaN(num) && Number.isInteger(num) && num > 0 ? num : null;
}

// #endregion

// #region Validacion

/** Mismo formato que el resto del FE (ver usuarios-validation.helpers.ts) — 8 digitos exactos. */
export const DNI_REGEX = /^\d{8}$/;

// #endregion
