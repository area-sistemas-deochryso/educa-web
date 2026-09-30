// * Tests for DEFAULT_ERROR_POLICY.resolveMessage — el fallback del facade debe ser alcanzable.
// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { DEFAULT_ERROR_POLICY } from './error-policy';
// #endregion

describe('DEFAULT_ERROR_POLICY.resolveMessage', () => {
	it('uses facade fallback when HttpErrorResponse has no curated backend message', () => {
		const err = new HttpErrorResponse({ error: { success: false }, status: 500 });
		expect(DEFAULT_ERROR_POLICY.resolveMessage(err, 'No se pudo guardar')).toBe('No se pudo guardar');
	});

	it('uses backend detail when present', () => {
		const err = new HttpErrorResponse({ error: { detail: 'Ya existe' }, status: 409 });
		expect(DEFAULT_ERROR_POLICY.resolveMessage(err, 'No se pudo guardar')).toBe('Ya existe');
	});

	it('uses fallback for non-HTTP errors', () => {
		expect(DEFAULT_ERROR_POLICY.resolveMessage(new Error('boom'), 'No se pudo guardar')).toBe('No se pudo guardar');
	});
});
