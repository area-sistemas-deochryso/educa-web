// #region Types

/** Rango de fechas con invariante: fin >= inicio. */
export interface DateRange {
	readonly start: Date;
	readonly end: Date;
}

/** Rango de fechas como strings ISO (para DTOs y formularios). */
export interface DateRangeString {
	readonly fechaInicio: string;
	readonly fechaFin: string;
}

// #endregion

// #region Validation

export interface DateRangeError {
	readonly field: 'start' | 'end' | 'range';
	readonly message: string;
}

/**
 * Valida que un rango de fechas sea válido.
 * Retorna null si es válido, o el error encontrado.
 *
 * Invariante: fechaFin >= fechaInicio (siempre).
 */
export function validateDateRange(
	start: string | Date | null | undefined,
	end: string | Date | null | undefined,
): DateRangeError | null {
	if (!start) return { field: 'start', message: 'Fecha de inicio requerida' };
	if (!end) return { field: 'end', message: 'Fecha de fin requerida' };

	const startDate = start instanceof Date ? start : new Date(start);
	const endDate = end instanceof Date ? end : new Date(end);

	if (isNaN(startDate.getTime()))
		return { field: 'start', message: 'Fecha de inicio inválida' };
	if (isNaN(endDate.getTime()))
		return { field: 'end', message: 'Fecha de fin inválida' };
	if (endDate < startDate)
		return {
			field: 'range',
			message: 'La fecha de fin debe ser igual o posterior a la de inicio',
		};

	return null;
}

/**
 * Crea un DateRange validado. Lanza si es inválido.
 * Usar solo cuando los datos ya fueron pre-validados (ej: desde API).
 */
export function createDateRange(start: Date, end: Date): DateRange {
	const error = validateDateRange(start, end);
	if (error)
		throw new Error(`DateRange inválido: ${error.message}`);
	return { start, end };
}

/**
 * Verifica si una fecha cae dentro de un rango (inclusive).
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
	return date >= range.start && date <= range.end;
}

// #endregion
