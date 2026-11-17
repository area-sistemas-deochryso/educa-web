import { describe, expect, it } from 'vitest';

import { clipGuideProgress, deriveStepTitle, estimateMinutes, progressFromDto, summarizeGuideProgress } from './faq-guide';

describe('deriveStepTitle', () => {
	it('toma la primera frase del texto', () => {
		expect(deriveStepTitle('Abre el menú. Luego elige Asistencias.')).toBe('Abre el menú');
	});

	it('recorta una primera frase muy larga con puntos suspensivos', () => {
		const title = deriveStepTitle('a'.repeat(100));

		expect(title.length).toBe(60);
		expect(title.endsWith('…')).toBe(true);
	});

	it('normaliza saltos de línea y espacios', () => {
		expect(deriveStepTitle('  Entra a\n   tu perfil  ')).toBe('Entra a tu perfil');
	});
});

describe('estimateMinutes', () => {
	it('un minuto por paso, con mínimo de uno', () => {
		expect(estimateMinutes(0)).toBe(1);
		expect(estimateMinutes(1)).toBe(1);
		expect(estimateMinutes(4)).toBe(4);
	});
});

describe('progressFromDto', () => {
	it('un `actual` ausente o nulo es «ningún paso trabajado»', () => {
		expect(progressFromDto({ hechos: [0, 2] })).toEqual({ done: [0, 2], current: null });
		expect(progressFromDto({ hechos: [1], actual: null })).toEqual({ done: [1], current: null });
		expect(progressFromDto({ hechos: [1], actual: 0 })).toEqual({ done: [1], current: 0 });
	});
});

describe('clipGuideProgress', () => {
	it('descarta pasos fuera de rango, repetidos o que no son enteros, y ordena', () => {
		expect(clipGuideProgress([2, 0, 7, -1, 2, 1.5], 1, 4)).toEqual({ done: [0, 2], current: 1 });
	});

	it('un paso actual fuera de rango queda sin definir', () => {
		expect(clipGuideProgress([0], 4, 4)).toEqual({ done: [0], current: null });
		expect(clipGuideProgress([0], undefined, 4)).toEqual({ done: [0], current: null });
	});

	it('si la guía quedó con menos pasos, recorta lo que ya no existe', () => {
		expect(clipGuideProgress([0, 3, 4], 4, 2)).toEqual({ done: [0], current: null });
	});
});

describe('summarizeGuideProgress', () => {
	const FECHA = '2026-11-17T10:00:00Z';

	it('sin pasos hechos no hay resumen: la guía nunca se marca', () => {
		expect(summarizeGuideProgress({ done: [], current: 1 }, 3, FECHA)).toBeNull();
		expect(summarizeGuideProgress({ done: [9], current: null }, 3, FECHA)).toBeNull();
	});

	it('en curso: cuenta lo hecho y sigue en el último paso trabajado (base 1)', () => {
		expect(summarizeGuideProgress({ done: [0, 1], current: 1 }, 5, FECHA)).toEqual({ status: 'en-curso', done: 2, total: 5, step: 2, fecha: FECHA });
	});

	it('en curso sin paso actual: sigue en el primer pendiente', () => {
		expect(summarizeGuideProgress({ done: [0, 1], current: null }, 5, FECHA)?.step).toBe(3);
	});

	it('terminada cuando están todos los pasos', () => {
		expect(summarizeGuideProgress({ done: [0, 1, 2], current: 2 }, 3, FECHA)).toMatchObject({ status: 'terminada', done: 3, total: 3 });
	});

	it('una guía que ganó pasos pasa de terminada a en curso', () => {
		expect(summarizeGuideProgress({ done: [0, 1, 2], current: 2 }, 4, FECHA)).toMatchObject({ status: 'en-curso', done: 3, total: 4 });
	});
});
