// * Tests for AttendanceDataService — día sin registro = F (salvo feriado/fin de semana/hoy/futuro) y columna Sábado.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AsistenciaDetalle, ConteoEstadosMensual } from '@data/models';
import type { AttendanceTable } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';

import { CalendarUtilsService } from '../calendar/calendar-utils.service';
import { AttendanceDataService } from './attendance-data.service';

// #endregion

// #region Helpers
// Hoy simulado: miércoles 21-oct-2026. Octubre 2026: 1 = jueves, 24 = sábado.
const HOY = new Date(2026, 9, 21, 10, 0, 0);

function registro(dia: number, estado: 'A' | 'T' | 'F' = 'A'): AsistenciaDetalle {
	const fecha = `2026-10-${String(dia).padStart(2, '0')}T00:00:00`;
	return {
		asistenciaId: dia,
		fecha,
		sede: 'Sede',
		horaEntrada: `2026-10-${String(dia).padStart(2, '0')}T07:25:00`,
		horaSalida: `2026-10-${String(dia).padStart(2, '0')}T14:40:00`,
		estado: 'Completa',
		observacion: null,
		tipoPersona: 'E',
		estadoCodigo: estado,
		estadoDescripcion: '',
		puedeJustificar: false,
		esJustificado: false,
		estadoIngreso: estado,
		estadoSalida: 'A',
	};
}

function statusDe(tabla: AttendanceTable, dia: number): string | undefined {
	for (const semana of tabla.weeks) {
		const celda = semana.days.find((d) => d.date?.getDate() === dia);
		if (celda) return celda.status;
	}
	return undefined;
}
// #endregion

// #region Tests
describe('AttendanceDataService', () => {
	let service: AttendanceDataService;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(HOY);
		TestBed.configureTestingModule({ providers: [AttendanceDataService, CalendarUtilsService] });
		service = TestBed.inject(AttendanceDataService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('día sin registro', () => {
		it('día hábil pasado sin registro es F', () => {
			const { ingresos, salidas } = service.processAsistencias([registro(1)], 10, 2026, 'Ana', undefined, []);

			expect(statusDe(ingresos, 2)).toBe('F'); // viernes pasado
			expect(statusDe(salidas, 2)).toBe('F');
			expect(statusDe(ingresos, 1)).toBe('A'); // con registro: se respeta el estado del backend
		});

		it('feriado sin registro NO es F', () => {
			const { ingresos } = service.processAsistencias([registro(1)], 10, 2026, 'Ana', undefined, [
				'2026-10-08T00:00:00',
			]);

			expect(statusDe(ingresos, 8)).toBe('X');
			expect(statusDe(ingresos, 7)).toBe('F');
		});

		it('hoy y días futuros sin registro NO son F', () => {
			const { ingresos } = service.processAsistencias([registro(1)], 10, 2026, 'Ana', undefined, []);

			expect(statusDe(ingresos, 21)).toBe('X'); // hoy
			expect(statusDe(ingresos, 22)).toBe('X'); // futuro
			expect(statusDe(ingresos, 30)).toBe('X');
		});

		it('sin lista de feriados (undefined) no se infiere F', () => {
			const { ingresos } = service.processAsistencias([registro(1)], 10, 2026, 'Ana');

			expect(statusDe(ingresos, 2)).toBe('X');
		});

		it('antes del inicio de registro (26-ene-2026) no es F', () => {
			const { ingresos } = service.processAsistencias([], 1, 2026, 'Ana', undefined, []);

			expect(statusDe(ingresos, 12)).toBe('X'); // 12-ene-2026, lunes anterior al corte
			expect(statusDe(ingresos, 27)).toBe('F'); // martes posterior al corte
		});

		it('con conteo del backend, las faltas sin registro se suman a F y no se pierden', () => {
			const conteo: ConteoEstadosMensual = {
				ingresos: { asistio: 1, tardanza: 0, falta: 1, justificado: 0, pendiente: 0 },
				salidas: { asistio: 1, tardanza: 0, falta: 0, justificado: 0, pendiente: 0 },
			};

			const { ingresos, salidas } = service.processAsistencias(
				[registro(1)],
				10,
				2026,
				'Ana',
				conteo,
				[],
			);

			// Días hábiles pasados sin registro en oct-2026 (2, 5-9, 12-16, 19-20) = 13
			expect(ingresos.counts.F).toBe(1 + 13);
			expect(salidas.counts.F).toBe(0 + 13);
		});
	});

	describe('columna Sábado (INV-C14)', () => {
		it('sin registro en sábado: 5 columnas', () => {
			const { ingresos } = service.processAsistencias([registro(1)], 10, 2026, 'Ana', undefined, []);

			expect(ingresos.dayHeaders).toHaveLength(5);
			expect(ingresos.weeks.every((w) => w.days.length === 5)).toBe(true);
		});

		it('con registro en sábado: 6 columnas y el sábado sin registro NO es F', () => {
			const { ingresos } = service.processAsistencias(
				[registro(1), registro(17, 'T')],
				10,
				2026,
				'Prof',
				undefined,
				[],
			);

			expect(ingresos.dayHeaders).toEqual([
				'Lunes',
				'Martes',
				'Miércoles',
				'Jueves',
				'Viernes',
				'Sábado',
			]);
			expect(ingresos.weeks.every((w) => w.days.length === 6)).toBe(true);
			expect(ingresos.columnTotals).toHaveLength(6);
			expect(statusDe(ingresos, 17)).toBe('T'); // sábado con registro
			expect(statusDe(ingresos, 10)).toBe('X'); // sábado pasado sin registro: día posible, no falta
			expect(statusDe(ingresos, 24)).toBe('X'); // sábado futuro
		});
	});
});
// #endregion
