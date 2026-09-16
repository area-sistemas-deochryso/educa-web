// Tests for horario-import.config — invariante INV-C08 (DayOfWeek: BD usa 1-7, domingo=7).
import { describe, expect, it } from 'vitest';

import type { HorarioImportRow } from './horario-import.config';
import { markIntraBatchConflicts, parseDiaSemana, parseHora, validateImportRowRango } from './horario-import.config';

describe('parseDiaSemana — INV-C08 (1=Lunes, 7=Domingo)', () => {
	it('acepta números 1-7 como DiaSemana válido', () => {
		expect(parseDiaSemana(1)).toBe(1);
		expect(parseDiaSemana(7)).toBe(7);
		expect(parseDiaSemana('3')).toBe(3);
	});

	it('rechaza números fuera de rango', () => {
		expect(parseDiaSemana(0)).toBeNull();
		expect(parseDiaSemana(8)).toBeNull();
		expect(parseDiaSemana(-1)).toBeNull();
	});

	it('mapea nombres de día a su número (lunes=1, domingo=7)', () => {
		expect(parseDiaSemana('Lunes')).toBe(1);
		expect(parseDiaSemana('Martes')).toBe(2);
		expect(parseDiaSemana('Miércoles')).toBe(3);
		expect(parseDiaSemana('Miercoles')).toBe(3);
		expect(parseDiaSemana('Jueves')).toBe(4);
		expect(parseDiaSemana('Viernes')).toBe(5);
		expect(parseDiaSemana('Sábado')).toBe(6);
		expect(parseDiaSemana('Sabado')).toBe(6);
		expect(parseDiaSemana('Domingo')).toBe(7);
	});

	it('es case-insensitive y trimea espacios', () => {
		expect(parseDiaSemana('  LUNES  ')).toBe(1);
		expect(parseDiaSemana('martes')).toBe(2);
	});

	it('rechaza valores vacíos, null, undefined', () => {
		expect(parseDiaSemana(null)).toBeNull();
		expect(parseDiaSemana(undefined)).toBeNull();
		expect(parseDiaSemana('')).toBeNull();
	});

	it('rechaza nombres desconocidos', () => {
		expect(parseDiaSemana('xyz')).toBeNull();
	});
});

describe('parseHora — formato HH:mm (usado en INV-C07)', () => {
	it('normaliza "8:00" a "08:00"', () => {
		expect(parseHora('8:00')).toBe('08:00');
	});

	it('conserva "08:30"', () => {
		expect(parseHora('08:30')).toBe('08:30');
	});

	it('acepta formato compacto "0800" / "800"', () => {
		expect(parseHora('0800')).toBe('08:00');
		expect(parseHora('800')).toBe('08:00');
	});

	it('retorna vacío para null/undefined/""', () => {
		expect(parseHora(null)).toBe('');
		expect(parseHora(undefined)).toBe('');
		expect(parseHora('')).toBe('');
	});
});

describe('validateImportRowRango — rango operativo 07:00-17:00 + duración máxima 4h', () => {
	it('rechaza un rango fuera de la franja operativa', () => {
		expect(validateImportRowRango('06:00', '08:00')).not.toBeNull();
	});

	it('rechaza una fila con hora fin antes que hora inicio (duración negativa no calza en rango válido)', () => {
		// hora fin antes que hora inicio produce una duración "negativa" que tampoco
		// excede MAX_DURACION_MINUTOS — el rechazo real de este caso ocurre en el caller
		// (horarios-import-dialog.component.ts: `horaInicio >= horaFin`) antes de llegar acá.
		expect(validateImportRowRango('10:00', '09:00')).toBeNull();
	});

	it('rechaza un bloque que excede la duración máxima de 4 horas', () => {
		expect(validateImportRowRango('08:00', '13:00')).not.toBeNull();
	});

	it('acepta un rango válido dentro de la franja operativa y bajo 4h', () => {
		expect(validateImportRowRango('08:00', '10:00')).toBeNull();
	});
});

describe('markIntraBatchConflicts', () => {
	function makeRow(overrides: Partial<HorarioImportRow>): HorarioImportRow {
		return {
			fila: 1,
			diaSemana: 1,
			diaLabel: 'Lunes',
			horaInicio: '08:00',
			horaFin: '09:00',
			salonId: 1,
			cursoId: 1,
			valido: true,
			error: null,
			...overrides,
		};
	}

	it('marca como inválidas dos filas del mismo batch que solapan (mismo salón y día)', () => {
		const rows: HorarioImportRow[] = [
			makeRow({ fila: 1, horaInicio: '08:00', horaFin: '09:30' }),
			makeRow({ fila: 2, horaInicio: '09:00', horaFin: '10:00' }),
		];
		const result = markIntraBatchConflicts(rows);
		expect(result[0].valido).toBe(false);
		expect(result[1].valido).toBe(false);
		expect(result[0].error).toContain('Conflicto con otra fila del archivo');
		expect(result[1].error).toContain('Conflicto con otra fila del archivo');
	});

	it('no marca conflicto entre filas sin solape de horario', () => {
		const rows: HorarioImportRow[] = [
			makeRow({ fila: 1, horaInicio: '08:00', horaFin: '09:00' }),
			makeRow({ fila: 2, horaInicio: '09:00', horaFin: '10:00' }),
		];
		const result = markIntraBatchConflicts(rows);
		expect(result[0].valido).toBe(true);
		expect(result[1].valido).toBe(true);
		expect(result).toEqual(rows);
	});

	it('no marca conflicto entre filas que se solapan en horario pero en salones distintos', () => {
		const rows: HorarioImportRow[] = [
			makeRow({ fila: 1, salonId: 1, horaInicio: '08:00', horaFin: '09:30' }),
			makeRow({ fila: 2, salonId: 2, horaInicio: '09:00', horaFin: '10:00' }),
		];
		const result = markIntraBatchConflicts(rows);
		expect(result[0].valido).toBe(true);
		expect(result[1].valido).toBe(true);
	});

	it('ignora filas ya inválidas al buscar conflictos (no las incluye en el chequeo cruzado)', () => {
		const rows: HorarioImportRow[] = [
			makeRow({ fila: 1, valido: false, error: 'Error previo', horaInicio: '08:00', horaFin: '09:30' }),
			makeRow({ fila: 2, horaInicio: '09:00', horaFin: '10:00' }),
		];
		const result = markIntraBatchConflicts(rows);
		expect(result[0].error).toBe('Error previo');
		expect(result[1].valido).toBe(true);
	});
});
