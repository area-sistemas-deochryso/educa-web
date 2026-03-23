// * Tests for nivel-educativo utility functions — validates education level detection.
// #region Imports
import { describe, expect, it } from 'vitest';

import {
	detectarNivel,
	determinarNiveles,
	filtrarPorNivel,
	esNivel,
	removeNivelPrefix,
} from './nivel-educativo.utils';

// #endregion

// #region detectarNivel
describe('detectarNivel', () => {
	it('should detect Inicial from keyword', () => {
		expect(detectarNivel('Inicial 3 Años')).toBe('Inicial');
		expect(detectarNivel('INICIAL 4 AÑOS')).toBe('Inicial');
	});

	it('should detect Inicial from "años" keyword', () => {
		expect(detectarNivel('3 Años')).toBe('Inicial');
		expect(detectarNivel('4 ANOS')).toBe('Inicial');
	});

	it('should detect Primaria', () => {
		expect(detectarNivel('Primaria 1er Grado')).toBe('Primaria');
		expect(detectarNivel('PRIMARIA 6TO GRADO')).toBe('Primaria');
	});

	it('should detect Secundaria', () => {
		expect(detectarNivel('Secundaria 1er Año')).toBe('Secundaria');
		expect(detectarNivel('SECUNDARIA 5TO')).toBe('Secundaria');
	});

	it('should return null for unrecognized names', () => {
		expect(detectarNivel('Taller de Arte')).toBeNull();
		expect(detectarNivel('')).toBeNull();
	});

	it('should handle accented characters', () => {
		expect(detectarNivel('Inicial - 3 Años')).toBe('Inicial');
	});
});
// #endregion

// #region determinarNiveles
describe('determinarNiveles', () => {
	it('should return unique niveles in order', () => {
		const result = determinarNiveles([
			'Primaria 1er Grado',
			'Inicial 3 Años',
			'Secundaria 1er Año',
			'Primaria 2do Grado',
		]);

		expect(result).toEqual(['Inicial', 'Primaria', 'Secundaria']);
	});

	it('should return empty for no matches', () => {
		expect(determinarNiveles(['Taller', 'Club'])).toEqual([]);
	});

	it('should return empty for empty input', () => {
		expect(determinarNiveles([])).toEqual([]);
	});

	it('should return single nivel', () => {
		expect(determinarNiveles(['Primaria 1', 'Primaria 2'])).toEqual(['Primaria']);
	});
});
// #endregion

// #region filtrarPorNivel
describe('filtrarPorNivel', () => {
	const items = [
		{ nombre: 'Inicial 3 Años', id: 1 },
		{ nombre: 'Primaria 1er Grado', id: 2 },
		{ nombre: 'Primaria 2do Grado', id: 3 },
		{ nombre: 'Secundaria 1er Año', id: 4 },
	];

	it('should filter by Inicial', () => {
		const result = filtrarPorNivel(items, 'Inicial');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
	});

	it('should filter by Primaria', () => {
		expect(filtrarPorNivel(items, 'Primaria')).toHaveLength(2);
	});

	it('should filter by Secundaria', () => {
		expect(filtrarPorNivel(items, 'Secundaria')).toHaveLength(1);
	});
});
// #endregion

// #region esNivel
describe('esNivel', () => {
	it('should return true for matching nivel', () => {
		expect(esNivel('Primaria 1er Grado', 'Primaria')).toBe(true);
	});

	it('should return false for non-matching nivel', () => {
		expect(esNivel('Primaria 1er Grado', 'Secundaria')).toBe(false);
	});
});
// #endregion

// #region removeNivelPrefix
describe('removeNivelPrefix', () => {
	it('should remove Inicial prefix', () => {
		expect(removeNivelPrefix('Inicial 3 Años')).toBe('3 Años');
		expect(removeNivelPrefix('INICIAL 4 ANOS')).toBe('4 ANOS');
	});

	it('should remove Primaria prefix', () => {
		expect(removeNivelPrefix('Primaria 1er Grado')).toBe('1er Grado');
	});

	it('should remove Secundaria prefix', () => {
		expect(removeNivelPrefix('Secundaria 1er Año')).toBe('1er Año');
	});

	it('should return original for unrecognized names', () => {
		expect(removeNivelPrefix('Taller de Arte')).toBe('Taller de Arte');
	});

	it('should handle names detected by "años" keyword (keeps dash if present)', () => {
		const result = removeNivelPrefix('Inicial - 3 Años');
		expect(result).toBe('- 3 Años');
	});
});
// #endregion
