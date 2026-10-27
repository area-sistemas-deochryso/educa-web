// * Tests for videoconferencias window utils — client-side mirror of VideoconferenciaGateService.ValidarVentanaHoraria.
import { describe, expect, it } from 'vitest';

import { VideoconferenciaItem } from './videoconferencias.models';
import { estaDentroDeVentana, estaFueraDeHorarioDeClase, resolveEstadoSala, toLocalIso } from './videoconferencias.window.utils';

const baseItem: VideoconferenciaItem = {
	horarioId: 1,
	cursoId: 10,
	cursoNombre: 'Matemática',
	salonDescripcion: '1A',
	diaSemana: 1, // Lunes
	diaSemanaDescripcion: 'Lunes',
	horaInicio: '08:00:00',
	horaFin: '09:30:00',
	profesorNombreCompleto: 'Prof A',
	cantidadEstudiantes: 30,
	habilitada: true,
	aperturaFueraDeHorario: false,
	aperturaDesde: null,
	aperturaHasta: null,
};

// Lunes 2026-01-05 (getDay() === 1)
function lunesAt(hh: number, mm: number): Date {
	return new Date(2026, 0, 5, hh, mm);
}

describe('estaDentroDeVentana', () => {
	it('is true at the start boundary (inclusive)', () => {
		expect(estaDentroDeVentana(baseItem, 0, lunesAt(8, 0))).toBe(true);
	});

	it('is true at the end boundary (inclusive)', () => {
		expect(estaDentroDeVentana(baseItem, 0, lunesAt(9, 30))).toBe(true);
	});

	it('is false before the window with no grace', () => {
		expect(estaDentroDeVentana(baseItem, 0, lunesAt(7, 59))).toBe(false);
	});

	it('is false after the window with no grace', () => {
		expect(estaDentroDeVentana(baseItem, 0, lunesAt(9, 31))).toBe(false);
	});

	it('extends the window on both ends with grace minutes', () => {
		expect(estaDentroDeVentana(baseItem, 15, lunesAt(7, 46))).toBe(true);
		expect(estaDentroDeVentana(baseItem, 15, lunesAt(9, 44))).toBe(true);
		expect(estaDentroDeVentana(baseItem, 15, lunesAt(7, 44))).toBe(false);
		expect(estaDentroDeVentana(baseItem, 15, lunesAt(9, 46))).toBe(false);
	});

	it('is false on a different day even within the time window', () => {
		// Martes 2026-01-06
		expect(estaDentroDeVentana(baseItem, 0, new Date(2026, 0, 6, 8, 30))).toBe(false);
	});
});

describe('resolveEstadoSala', () => {
	it('is disponible for a student within window and habilitada', () => {
		expect(resolveEstadoSala(baseItem, false, lunesAt(8, 30))).toBe('disponible');
	});

	it('is esperando-apertura for a student outside window when habilitada but the BE reports no apertura', () => {
		expect(resolveEstadoSala(baseItem, false, lunesAt(10, 0))).toBe('esperando-apertura');
	});

	it('is disponible for a student outside window when habilitada and the BE reports apertura vigente', () => {
		const item = { ...baseItem, aperturaFueraDeHorario: true };
		expect(resolveEstadoSala(item, false, lunesAt(10, 0))).toBe('disponible');
	});

	it('is fuera-de-horario for a student outside window when not habilitada, even with apertura flag', () => {
		const item = { ...baseItem, habilitada: false, aperturaFueraDeHorario: true };
		expect(resolveEstadoSala(item, false, lunesAt(10, 0))).toBe('fuera-de-horario');
	});

	it('ignores the apertura flag for the student inside the window when not habilitada', () => {
		const item = { ...baseItem, habilitada: false, aperturaFueraDeHorario: true };
		expect(resolveEstadoSala(item, false, lunesAt(8, 30))).toBe('no-habilitada');
	});

	it('is no-habilitada for a student within window but not habilitada', () => {
		const item = { ...baseItem, habilitada: false };
		expect(resolveEstadoSala(item, false, lunesAt(8, 30))).toBe('no-habilitada');
	});

	it('ignores habilitada for the moderator role', () => {
		const item = { ...baseItem, habilitada: false };
		expect(resolveEstadoSala(item, true, lunesAt(8, 30))).toBe('disponible');
	});

	it('gives the moderator a wider grace window than the student', () => {
		// 7:50 — fuera de la ventana estricta del estudiante, dentro de la gracia del moderador (15 min)
		expect(resolveEstadoSala(baseItem, false, lunesAt(7, 50))).not.toBe('disponible');
		expect(resolveEstadoSala(baseItem, true, lunesAt(7, 50))).toBe('disponible');
	});

	it('is fuera-de-horario for the moderator beyond their own grace window', () => {
		expect(resolveEstadoSala(baseItem, true, lunesAt(7, 40))).toBe('fuera-de-horario');
	});
});

describe('estaFueraDeHorarioDeClase', () => {
	it('is false inside the exact class window', () => {
		expect(estaFueraDeHorarioDeClase(baseItem, lunesAt(8, 30))).toBe(false);
	});

	it('is true inside the moderator grace window (class window has no grace)', () => {
		expect(estaFueraDeHorarioDeClase(baseItem, lunesAt(7, 50))).toBe(true);
	});

	it('is true on another day', () => {
		expect(estaFueraDeHorarioDeClase(baseItem, new Date(2026, 0, 6, 8, 30))).toBe(true);
	});
});

describe('toLocalIso', () => {
	it('keeps wall-clock time without UTC conversion', () => {
		expect(toLocalIso(new Date(2026, 9, 27, 18, 5, 33))).toBe('2026-10-27T18:05:00');
	});

	it('zero-pads month, day, hour and minute', () => {
		expect(toLocalIso(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03:00');
	});
});
