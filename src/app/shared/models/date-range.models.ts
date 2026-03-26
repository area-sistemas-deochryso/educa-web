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

export interface DateRangeError {
	readonly field: 'start' | 'end' | 'range';
	readonly message: string;
}

// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
	validateDateRange,
	createDateRange,
	isDateInRange,
} from '@shared/utils/date-range.utils';
