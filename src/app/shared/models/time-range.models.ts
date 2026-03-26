// #region Types

/**
 * Rango horario con invariante: horaFin > horaInicio.
 * Formato "HH:mm" (24h).
 */
export interface TimeRange {
	readonly horaInicio: string;
	readonly horaFin: string;
}

export interface TimeRangeError {
	readonly field: 'horaInicio' | 'horaFin' | 'range';
	readonly message: string;
}

// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
	validateTimeRange,
	createTimeRange,
	timeRangesOverlap,
} from '@shared/utils/time-range.utils';
