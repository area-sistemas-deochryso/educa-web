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

describe('highlightSegments multi-palabra', () => {
	it('resalta cada palabra sin importar tildes ni orden', () => {
		expect(highlightSegments('Recuperar contraseña de sesión', 'sesion contrasena')).toEqual([
			{ text: 'Recuperar ', match: false },
			{ text: 'contraseña', match: true },
			{ text: ' de ', match: false },
			{ text: 'sesión', match: true },
		]);
	});

	it('une rangos solapados o contiguos', () => {
		expect(highlightSegments('inicio de sesión', 'inicio inic')).toEqual([
			{ text: 'inicio', match: true },
			{ text: ' de sesión', match: false },
		]);
	});

	it('el índice sobre el original es correcto con tildes decompuestas (NFD)', () => {
		const text = 'Co\u0301mo entro';
		expect(highlightSegments(text, 'entro')).toEqual([
			{ text: 'Co\u0301mo ', match: false },
			{ text: 'entro', match: true },
		]);
	});

	it('si la palabra no está en el texto visible no resalta nada', () => {
		expect(highlightSegments('Alta de usuario', 'login')).toEqual([{ text: 'Alta de usuario', match: false }]);
	});
});
