// Tests for horario-import.config — invariante INV-C08 (DayOfWeek: BD usa 1-7, domingo=7).
import { describe, expect, it } from 'vitest';

import { parseDiaSemana, parseHora } from './horario-import.config';

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
