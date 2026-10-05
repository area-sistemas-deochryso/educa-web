// * Tests for the pure input helpers shared by the individual and group grading lists.
// #region Imports
import { describe, expect, it } from 'vitest';
import type { ConfiguracionLiteralDto } from '@data/models';

import { clampNota, literalMidpoint, sanitizeObservacion } from './calificar-dialog.helpers';

// #endregion

describe('clampNota', () => {
	it('rounds to one decimal', () => {
		expect(clampNota(14.26)).toBe(14.3);
	});

	it('clamps to the 0-20 range', () => {
		expect(clampNota(25)).toBe(20);
		expect(clampNota(-3)).toBe(0);
	});
});

describe('literalMidpoint', () => {
	it('returns null without a literal or without bounds', () => {
		expect(literalMidpoint(null)).toBeNull();
		expect(literalMidpoint({ notaMinima: null, notaMaxima: 20 } as ConfiguracionLiteralDto)).toBeNull();
	});

	it('returns the midpoint rounded to one decimal', () => {
		expect(literalMidpoint({ notaMinima: 11, notaMaxima: 14 } as ConfiguracionLiteralDto)).toBe(12.5);
	});
});

describe('sanitizeObservacion', () => {
	it('strips disallowed characters and keeps accents and punctuation', () => {
		expect(sanitizeObservacion('Muy bien <b>ñandú</b>, sí.')).toBe('Muy bien bñandúb, sí.');
	});

	it('truncates to 100 characters', () => {
		expect(sanitizeObservacion('a'.repeat(150))).toHaveLength(100);
	});
});
