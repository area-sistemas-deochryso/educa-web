import type { DiaSemana } from '@data/models';
import { timeRangesOverlap } from '@shared/models';
import { validateRangoYDuracion } from './horario-form.utils';

// #region Tipos de importacion

export interface ImportarHorarioItem {
	diaSemana: DiaSemana;
	horaInicio: string;
	horaFin: string;
	salonId: number;
	cursoId: number;
}

export interface ImportarHorariosResult {
	creados: number;
	rechazados: number;
	errores: ImportarHorarioError[];
}

export interface ImportarHorarioError {
	fila: number;
	dia: string;
	horaInicio: string;
	horaFin: string;
	razon: string;
}

// #endregion

// #region Parseo de filas

export interface HorarioImportRow {
	fila: number;
	diaSemana: DiaSemana | null;
	diaLabel: string;
	horaInicio: string;
	horaFin: string;
	salonId: number | null;
	cursoId: number | null;
	valido: boolean;
	error: string | null;
}

// #endregion

// #region Mapeo de dias

export const DIA_SEMANA_MAP: Record<string, number> = {
	lunes: 1,
	martes: 2,
	'miércoles': 3,
	miercoles: 3,
	jueves: 4,
	viernes: 5,
	'sábado': 6,
	sabado: 6,
	domingo: 7,
};

// #endregion

// #region Mapeo de columnas

/** Matchers para detectar columnas por nombre de header (case-insensitive, sin espacios) */
export const HORARIO_COLUMN_MATCHERS: Record<string, string[]> = {
	diaSemana: ['DIA', 'DÍA', 'DIASEMANA', 'DIA_SEMANA', 'DIA SEMANA'],
	horaInicio: ['HORAINICIO', 'HORA_INICIO', 'HORA INICIO', 'INICIO'],
	horaFin: ['HORAFIN', 'HORA_FIN', 'HORA FIN', 'FIN'],
	salonId: ['SALON', 'SALÓN', 'SALONID', 'SALON_ID', 'SALON ID', 'IDSALON'],
	cursoId: ['CURSO', 'CURSOID', 'CURSO_ID', 'CURSO ID', 'IDCURSO'],
};

/**
 * Busca la key de un objeto que coincida con alguno de los matchers de la columna dada.
 * Normaliza a uppercase y sin espacios para comparar.
 */
export function findColumnKey(keys: string[], columnName: keyof typeof HORARIO_COLUMN_MATCHERS): string | null {
	const matchers = HORARIO_COLUMN_MATCHERS[columnName];
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
 * Parsea el nombre de un dia a su numero DiaSemana.
 * Soporta texto ("Lunes") y numeros (1-7).
 */
export function parseDiaSemana(value: unknown): DiaSemana | null {
	if (value == null || value === '') return null;

	// Si es numero directo
	const num = Number(value);
	if (!isNaN(num) && num >= 1 && num <= 7) return num as DiaSemana;

	// Si es texto
	const text = String(value).toLowerCase().trim();
	const mapped = DIA_SEMANA_MAP[text];
	return mapped ? (mapped as DiaSemana) : null;
}

/**
 * Normaliza una hora a formato HH:mm.
 * Acepta "8:00", "08:00", "8", "0800".
 */
export function parseHora(value: unknown): string {
	if (value == null || value === '') return '';

	const text = String(value).trim();

	// Ya tiene formato HH:mm o H:mm
	const colonMatch = text.match(/^(\d{1,2}):(\d{2})$/);
	if (colonMatch) {
		const h = colonMatch[1].padStart(2, '0');
		return `${h}:${colonMatch[2]}`;
	}

	// Formato sin separador "0800" o "800"
	const numOnly = text.replace(/\D/g, '');
	if (numOnly.length >= 3 && numOnly.length <= 4) {
		const padded = numOnly.padStart(4, '0');
		return `${padded.substring(0, 2)}:${padded.substring(2, 4)}`;
	}

	return text;
}

/**
 * Parsea un ID numerico entero.
 */
export function parseId(value: unknown): number | null {
	if (value == null || value === '') return null;
	const num = Number(value);
	return !isNaN(num) && Number.isInteger(num) && num > 0 ? num : null;
}

/**
 * Valida el rango horario de una fila importada contra el mismo validador centralizado
 * que usa el formulario manual (rango operativo 07:00-17:00 + duración máxima 4h).
 * Sin este chequeo, la importación masiva era la vía más fácil para colar un horario
 * anómalo (ej. un bloque de 14 horas) porque solo se validaba solape, no rango/duración.
 */
export function validateImportRowRango(horaInicio: string, horaFin: string): string | null {
	return validateRangoYDuracion(horaInicio, horaFin);
}

// #endregion

// #region Labels

const DIA_LABELS: Record<number, string> = {
	1: 'Lunes',
	2: 'Martes',
	3: 'Miércoles',
	4: 'Jueves',
	5: 'Viernes',
	6: 'Sábado',
	7: 'Domingo',
};

export function getDiaLabel(dia: DiaSemana | null): string {
	return dia ? DIA_LABELS[dia] ?? `Día ${dia}` : '—';
}

// #endregion

// #region Intra-batch conflict detection

export function markIntraBatchConflicts(rows: HorarioImportRow[]): HorarioImportRow[] {
	const validRows = rows.filter((r) => r.valido);

	const conflictIndices = new Set<number>();

	for (let i = 0; i < validRows.length; i++) {
		for (let j = i + 1; j < validRows.length; j++) {
			const a = validRows[i];
			const b = validRows[j];
			if (a.salonId !== b.salonId || a.diaSemana !== b.diaSemana) continue;
			if (timeRangesOverlap(
				{ horaInicio: a.horaInicio, horaFin: a.horaFin },
				{ horaInicio: b.horaInicio, horaFin: b.horaFin },
			)) {
				conflictIndices.add(i);
				conflictIndices.add(j);
			}
		}
	}

	if (conflictIndices.size === 0) return rows;

	const validIndexMap = new Map<HorarioImportRow, number>();
	validRows.forEach((r, i) => validIndexMap.set(r, i));

	return rows.map((row) => {
		const idx = validIndexMap.get(row);
		if (idx === undefined || !conflictIndices.has(idx)) return row;
		return {
			...row,
			valido: false,
			error: [row.error, 'Conflicto con otra fila del archivo'].filter(Boolean).join(', '),
		};
	});
}

// #endregion
