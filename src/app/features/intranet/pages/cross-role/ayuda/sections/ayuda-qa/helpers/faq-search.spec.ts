import { describe, expect, it } from 'vitest';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { faqMatchesWords, normalizeSearchText, splitSearchWords } from './faq-search';

const FAQ: FaqDto = {
	id: 1,
	pregunta: '¿Cómo cambio mi contraseña?',
	respuesta: 'Ve a tu perfil.',
	categoria: null,
	wizard: null,
};

describe('faq-search', () => {
	it('normaliza minúsculas y tildes', () => {
		expect(normalizeSearchText('Sesión ÁÉÍ ñ')).toBe('sesion aei n');
	});

	it('parte en palabras distintas con tope de 8', () => {
		expect(splitSearchWords('  Login  login INICIO ')).toEqual(['login', 'inicio']);
		expect(splitSearchWords('a b c d e f g h i j')).toHaveLength(8);
	});

	it('sin palabras coincide con todo', () => {
		expect(faqMatchesWords(FAQ, [])).toBe(true);
	});

	it('exige todas las palabras en cualquier orden', () => {
		expect(faqMatchesWords(FAQ, splitSearchWords('contrasena perfil'))).toBe(true);
		expect(faqMatchesWords(FAQ, splitSearchWords('contrasena notas'))).toBe(false);
	});
});
