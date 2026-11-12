import { describe, expect, it } from 'vitest';

import { highlightSegments } from './faq-highlight';

describe('highlightSegments', () => {
	it('sin término devuelve el texto completo sin resaltar', () => {
		expect(highlightSegments('Cambiar contraseña', '  ')).toEqual([
			{ text: 'Cambiar contraseña', match: false },
		]);
	});

	it('resalta cada coincidencia sin distinguir mayúsculas y conserva el texto original', () => {
		expect(highlightSegments('Corregir asistencia y ASISTENCIA', 'asistencia')).toEqual([
			{ text: 'Corregir ', match: false },
			{ text: 'asistencia', match: true },
			{ text: ' y ', match: false },
			{ text: 'ASISTENCIA', match: true },
		]);
	});

	it('sin coincidencias devuelve un solo segmento sin resaltar', () => {
		expect(highlightSegments('Alta de usuario', 'curso')).toEqual([
			{ text: 'Alta de usuario', match: false },
		]);
	});
});
