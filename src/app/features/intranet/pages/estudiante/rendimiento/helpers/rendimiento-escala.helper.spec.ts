// * Tests for rendimiento-escala.helper — eje en letras (INV-C13, INV-U06).
import { describe, expect, it } from 'vitest';

import type { ConfiguracionCalificacionListDto } from '@data/models';
import { buildBandas, letraDePromedio } from './rendimiento-escala.helper';

const ESCALA_LITERAL: ConfiguracionCalificacionListDto = {
	id: 1,
	nivel: 'Primaria',
	tipoCalificacion: 'LITERAL',
	notaMinAprobatoria: 11,
	anio: 2026,
	estado: true,
	literales: [
		{ id: 1, letra: 'AD', descripcion: 'Logro destacado', notaMinima: 18, notaMaxima: 20, orden: 1, esAprobatoria: true },
		{ id: 2, letra: 'A', descripcion: 'Logro esperado', notaMinima: 14, notaMaxima: 17, orden: 2, esAprobatoria: true },
		{ id: 3, letra: 'B', descripcion: 'En proceso', notaMinima: 11, notaMaxima: 13, orden: 3, esAprobatoria: true },
		{ id: 4, letra: 'C', descripcion: 'En inicio', notaMinima: 0, notaMaxima: 10, orden: 4, esAprobatoria: false },
	],
};

const ESCALA_NUMERICA: ConfiguracionCalificacionListDto = {
	...ESCALA_LITERAL,
	tipoCalificacion: 'NUMERICO',
	literales: [],
};

describe('rendimiento-escala.helper', () => {
	describe('letraDePromedio (INV-C13)', () => {
		it('puts 10.3 in C (rounds to 10), not in the next letter', () => {
			expect(letraDePromedio(10.3, ESCALA_LITERAL)).toBe('C');
		});

		it('rounds half up: 10.5 is B', () => {
			expect(letraDePromedio(10.5, ESCALA_LITERAL)).toBe('B');
		});

		it('returns null with a numeric scale, without config or without a grade', () => {
			expect(letraDePromedio(15, ESCALA_NUMERICA)).toBeNull();
			expect(letraDePromedio(15, null)).toBeNull();
			expect(letraDePromedio(null, ESCALA_LITERAL)).toBeNull();
		});
	});

	describe('buildBandas', () => {
		it('returns the literal bands from lowest to highest covering 0-20 without gaps', () => {
			const bandas = buildBandas(ESCALA_LITERAL);

			expect(bandas.map((b) => b.letra)).toEqual(['C', 'B', 'A', 'AD']);
			expect(bandas[0].desde).toBe(0);
			expect(bandas[bandas.length - 1].hasta).toBe(20);
			for (let i = 1; i < bandas.length; i++) {
				expect(bandas[i].desde).toBe(bandas[i - 1].hasta);
			}
		});

		it('places the C/B boundary where 10.5 starts to be B', () => {
			const [c, b] = buildBandas(ESCALA_LITERAL);

			expect(c.hasta).toBe(10.5);
			expect(b.desde).toBe(10.5);
		});

		it('marks failing letters as danger and the top letter as success', () => {
			const bandas = buildBandas(ESCALA_LITERAL);

			expect(bandas.find((b) => b.letra === 'C')?.severity).toBe('danger');
			expect(bandas.find((b) => b.letra === 'AD')?.severity).toBe('success');
		});

		it('keeps the numeric axis (no bands) for a numeric scale or no config', () => {
			expect(buildBandas(ESCALA_NUMERICA)).toEqual([]);
			expect(buildBandas(null)).toEqual([]);
		});
	});
});
