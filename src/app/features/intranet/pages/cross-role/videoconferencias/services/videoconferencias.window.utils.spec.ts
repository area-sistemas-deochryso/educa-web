// * Tests for videoconferencias window utils — client-side mirror of VideoconferenciaGateService.ValidarVentanaHoraria.
import { describe, expect, it } from 'vitest';

import { VideoconferenciaItem } from './videoconferencias.models';
import { estaDentroDeVentana, resolveEstadoSala } from './videoconferencias.window.utils';

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

	it('is fuera-de-horario for a student outside window even if habilitada', () => {
		expect(resolveEstadoSala(baseItem, false, lunesAt(10, 0))).toBe('fuera-de-horario');
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
		expect(resolveEstadoSala(baseItem, false, lunesAt(7, 50))).toBe('fuera-de-horario');
		expect(resolveEstadoSala(baseItem, true, lunesAt(7, 50))).toBe('disponible');
	});

	it('is fuera-de-horario for the moderator beyond their own grace window', () => {
		expect(resolveEstadoSala(baseItem, true, lunesAt(7, 40))).toBe('fuera-de-horario');
	});
});
