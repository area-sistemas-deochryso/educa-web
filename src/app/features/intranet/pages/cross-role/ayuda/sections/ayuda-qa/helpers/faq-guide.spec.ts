import { describe, expect, it } from 'vitest';

import { deriveStepTitle, estimateMinutes } from './faq-guide';

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
