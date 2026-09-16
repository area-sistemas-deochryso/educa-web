// Tests for calificacion utils — invariante INV-C04 (promedio = Σ(nota × peso), pesos como
// fracciones absolutas SIN normalizar entre sí, redondeo 1 decimal)
// y INV-T04 parcial (ventana de edición de 2 meses desde fechaCalificacion).
import type { CalificacionDto, NotaResumenDto, PeriodoCalificacionDto } from '@data/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calcularPromedioPonderado, esNotaEditable, recalcularPromedios } from './calificacion.utils';

describe('calcularPromedioPonderado — INV-C04', () => {
	it('retorna null para lista vacía', () => {
		expect(calcularPromedioPonderado([])).toBeNull();
	});

	it('calcula promedio ponderado con pesos que suman 1.0', () => {
		const notas = [
			{ nota: 15, peso: 0.5 },
			{ nota: 10, peso: 0.5 },
		];
		expect(calcularPromedioPonderado(notas)).toBe(12.5);
	});

	it('NO normaliza pesos que no suman 1.0 — refleja el % del curso realmente evaluado', () => {
		// Σ(nota×peso) = 15*0.2 + 10*0.2 = 5.0 (solo 40% del curso evaluado, sin normalizar)
		const notas = [
			{ nota: 15, peso: 0.2 },
			{ nota: 10, peso: 0.2 },
		];
		expect(calcularPromedioPonderado(notas)).toBe(5.0);
	});

	it('redondea a 1 decimal (half-away-from-zero)', () => {
		// 20*0.333 + 18*0.333 + 16*0.334 = 17.998, redondea a 18.0
		const notas = [
			{ nota: 20, peso: 0.333 },
			{ nota: 18, peso: 0.333 },
			{ nota: 16, peso: 0.334 },
		];
		const result = calcularPromedioPonderado(notas);
		expect(result).toBeCloseTo(18.0, 1);
	});

	it('maneja una sola nota con peso 1.0', () => {
		expect(calcularPromedioPonderado([{ nota: 14, peso: 1.0 }])).toBe(14);
	});

	it('un peso fraccionario mínimo produce un promedio proporcionalmente bajo', () => {
		expect(calcularPromedioPonderado([{ nota: 20, peso: 0.01 }])).toBe(0.2);
	});
});

describe('esNotaEditable — INV-T04 parcial (ventana de edición 2 meses)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('retorna true para nota dentro de los 2 meses', () => {
		vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(true);
	});

	it('retorna false para nota más vieja que 2 meses', () => {
		vi.setSystemTime(new Date('2026-05-01T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(false);
	});

	it('retorna true para nota del mismo día', () => {
		vi.setSystemTime(new Date('2026-04-15T10:00:00Z'));
		expect(esNotaEditable('2026-04-15')).toBe(true);
	});

	it('retorna false justo pasado el límite de 2 meses', () => {
		vi.setSystemTime(new Date('2026-04-16T10:00:00Z'));
		expect(esNotaEditable('2026-02-15')).toBe(false);
	});
});

describe('recalcularPromedios', () => {
	const evaluaciones: CalificacionDto[] = [
		{ id: 1, cursoContenidoId: 1, tareaId: null, semanaId: 1, numeroSemana: 1, titulo: 'Ex1', peso: 0.5, fechaEvaluacion: '2026-01-10' },
		{ id: 2, cursoContenidoId: 1, tareaId: null, semanaId: 2, numeroSemana: 2, titulo: 'Ex2', peso: 0.5, fechaEvaluacion: '2026-01-20' },
		{ id: 3, cursoContenidoId: 1, tareaId: null, semanaId: 5, numeroSemana: 5, titulo: 'Ex3', peso: 1.0, fechaEvaluacion: '2026-02-15' },
	];

	const periodos: PeriodoCalificacionDto[] = [
		{ id: 1, nombre: 'Periodo 1', orden: 1, semanaInicio: 1, semanaFin: 3 },
		{ id: 2, nombre: 'Periodo 2', orden: 2, semanaInicio: 4, semanaFin: 6 },
	];

	it('ignora notas null/undefined al calcular el promedio de un periodo', () => {
		const notas: NotaResumenDto[] = [
			{ calificacionId: 1, nota: 15 },
			{ calificacionId: 2, nota: null },
		];
		const result = recalcularPromedios(notas, evaluaciones, periodos);
		const periodo1 = result.find((p) => p.periodo === 'Periodo 1');
		// Solo la nota id=1 (peso 0.5) entra al cálculo — 15 * 0.5 = 7.5
		expect(periodo1?.promedio).toBe(7.5);
	});

	it('filtra evaluaciones por rango de semana límite (inclusive en ambos extremos)', () => {
		const notas: NotaResumenDto[] = [
			{ calificacionId: 1, nota: 10 },
			{ calificacionId: 2, nota: 20 },
			{ calificacionId: 3, nota: 18 },
		];
		const result = recalcularPromedios(notas, evaluaciones, periodos);
		const periodo1 = result.find((p) => p.periodo === 'Periodo 1');
		const periodo2 = result.find((p) => p.periodo === 'Periodo 2');
		// Periodo 1 (semanas 1-3): incluye ambas semana 1 y semana 2 — 10*0.5 + 20*0.5 = 15
		expect(periodo1?.promedio).toBe(15);
		// Periodo 2 (semanas 4-6): incluye solo semana 5 — 18*1.0 = 18
		expect(periodo2?.promedio).toBe(18);
	});

	it('agrega el periodo "General" con todas las evaluaciones sin importar el rango', () => {
		const notas: NotaResumenDto[] = [
			{ calificacionId: 1, nota: 10 },
			{ calificacionId: 2, nota: 20 },
			{ calificacionId: 3, nota: 18 },
		];
		const result = recalcularPromedios(notas, evaluaciones, periodos);
		expect(result).toHaveLength(3);
		const general = result.find((p) => p.periodo === 'General');
		// 10*0.5 + 20*0.5 + 18*1.0 = 33
		expect(general?.promedio).toBe(33);
	});

	it('retorna null como promedio de un periodo sin ninguna nota registrada', () => {
		const notas: NotaResumenDto[] = [];
		const result = recalcularPromedios(notas, evaluaciones, periodos);
		expect(result.every((p) => p.promedio === null)).toBe(true);
	});
});
