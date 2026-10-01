import { describe, expect, it } from 'vitest';
import { getInitialsFromParts, getPersonInitials } from './string.utils';

describe('getPersonInitials', () => {
	it('toma primer apellido + primer nombre con 3+ palabras', () => {
		expect(getPersonInitials('Perez Gomez Juan Carlos')).toBe('PJ');
	});
	it('usa ambas palabras con 2', () => expect(getPersonInitials('Perez Juan')).toBe('PJ'));
	it('una palabra', () => expect(getPersonInitials('perez')).toBe('P'));
	it.each([[''], ['  '], [null], [undefined]])('vacío %j → ""', (v) => expect(getPersonInitials(v)).toBe(''));
});

describe('getInitialsFromParts', () => {
	it('apellido + nombre', () => expect(getInitialsFromParts('Perez Gomez', 'Juan')).toBe('PJ'));
	it('tolera nulos', () => expect(getInitialsFromParts(null, 'juan')).toBe('J'));
});
