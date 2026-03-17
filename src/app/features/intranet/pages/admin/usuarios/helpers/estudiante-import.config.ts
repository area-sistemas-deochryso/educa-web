// #region Interfaces

export interface EstudianteImportRow {
	nombreCompleto: string;
	apellidos: string;
	nombres: string;
	dni?: string;
	grado: string;
	seccion: string;
	nombreApoderado?: string;
	correoApoderado?: string;
}

// #endregion
// #region Constants

/** Mapeo nombre de hoja Excel → grado en BD */
export const SHEET_TO_GRADO: Record<string, string> = {
	'3 AÑOS': 'INICIAL 3 AÑOS',
	'4 AÑOS': 'INICIAL 4 AÑOS',
	'5 AÑOS': 'INICIAL 5 AÑOS',
	'1ER G': '1RO PRIMARIA',
	'2DO G': '2DO PRIMARIA',
	'3ER G': '3RO PRIMARIA',
	'4TO G': '4TO PRIMARIA',
	'5TO G': '5TO PRIMARIA',
	'6TO G': '6TO PRIMARIA',
	'1ERO SEC': '1RO SECUNDARIA',
	'2DO SEC': '2DO SECUNDARIA',
	'3ERO SEC': '3RO SECUNDARIA',
	'4TO SEC': '4TO SECUNDARIA',
	'5TO SEC': '5TO SECUNDARIA',
};

export const SECCIONES_IMPORT: { label: string; value: string }[] = [
	{ label: 'A — Sección A', value: 'A' },
	{ label: 'B — Sección B', value: 'B' },
	{ label: 'V — Verano', value: 'V' },
];

// #endregion
// #region Parsing helpers

/**
 * Divide un campo "APELLIDOS Y NOMBRES" combinado.
 * Regla 1: Si tiene coma → "APELLIDOS, NOMBRES"
 * Regla 2: Sin coma → primeras 2 palabras = apellidos, resto = nombres
 */
export function splitNombreCompleto(raw: string): { apellidos: string; nombres: string } {
	const clean = raw.trim().replace(/\s+/g, ' ').toUpperCase();

	if (clean.includes(',')) {
		const idx = clean.indexOf(',');
		return {
			apellidos: clean.slice(0, idx).trim(),
			nombres: clean.slice(idx + 1).trim(),
		};
	}

	const words = clean.split(' ').filter(Boolean);
	if (words.length <= 2) return { apellidos: words[0] ?? '', nombres: words[1] ?? '' };
	return {
		apellidos: words.slice(0, 2).join(' '),
		nombres: words.slice(2).join(' '),
	};
}

/**
 * Convierte un valor raw de SheetJS a DNI string de 8 dígitos.
 * SheetJS puede retornar el DNI como número.
 * Retorna undefined si el valor no es un DNI válido.
 */
export function parseDni(raw: unknown): string | undefined {
	if (raw === undefined || raw === null || raw === '') return undefined;
	const str = String(Math.round(Number(raw))).padStart(8, '0');
	return /^\d{8}$/.test(str) ? str : undefined;
}

// #endregion
