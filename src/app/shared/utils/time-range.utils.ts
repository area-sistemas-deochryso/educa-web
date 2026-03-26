import { type TimeRange, type TimeRangeError } from '@shared/models/time-range.models';

// #region Validation

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valida que un rango horario sea válido.
 * Retorna null si es válido, o el error encontrado.
 *
 * Invariante: horaFin > horaInicio (estricto, no pueden ser iguales).
 */
export function validateTimeRange(
	horaInicio: string | null | undefined,
	horaFin: string | null | undefined,
): TimeRangeError | null {
	if (!horaInicio)
		return { field: 'horaInicio', message: 'Hora de inicio requerida' };
	if (!horaFin)
		return { field: 'horaFin', message: 'Hora de fin requerida' };

	if (!TIME_REGEX.test(horaInicio))
		return {
			field: 'horaInicio',
			message: 'Formato inválido (usar HH:mm)',
		};
	if (!TIME_REGEX.test(horaFin))
		return { field: 'horaFin', message: 'Formato inválido (usar HH:mm)' };

	if (horaFin <= horaInicio)
		return {
			field: 'range',
			message: 'La hora de fin debe ser posterior a la hora de inicio',
		};

	return null;
}

/**
 * Crea un TimeRange validado. Lanza si es inválido.
 */
export function createTimeRange(horaInicio: string, horaFin: string): TimeRange {
	const error = validateTimeRange(horaInicio, horaFin);
	if (error)
		throw new Error(`TimeRange inválido: ${error.message}`);
	return { horaInicio, horaFin };
}

/**
 * Determina si dos rangos horarios se solapan.
 */
export function timeRangesOverlap(a: TimeRange, b: TimeRange): boolean {
	return (
		(a.horaInicio >= b.horaInicio && a.horaInicio < b.horaFin) ||
		(a.horaFin > b.horaInicio && a.horaFin <= b.horaFin) ||
		(a.horaInicio <= b.horaInicio && a.horaFin >= b.horaFin)
	);
}

// #endregion
