// * Tests for extractErrorMessage — validates message extraction from ApiResponse
// * and ASP.NET Core ValidationProblemDetails shapes.
// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { extractErrorMessage } from './error.utils';
// #endregion

describe('extractErrorMessage', () => {
	// #region ApiResponse format

	it('returns backend message from ApiResponse shape', () => {
		const err = new HttpErrorResponse({
			error: { success: false, message: 'El nombre no puede exceder 50 caracteres' },
			status: 400,
		});

		expect(extractErrorMessage(err)).toBe('El nombre no puede exceder 50 caracteres');
	});

	it('returns backend message from ApiResponse mensaje variant', () => {
		const err = new HttpErrorResponse({
			error: { success: false, mensaje: 'Recurso no encontrado' },
			status: 404,
		});

		expect(extractErrorMessage(err)).toBe('Recurso no encontrado');
	});

	// #endregion

	// #region ValidationProblemDetails format

	it('returns first field first message from ValidationProblemDetails', () => {
		// ASP.NET Core [ApiController] returns this shape for [StringLength] violations
		const err = new HttpErrorResponse({
			error: {
				errors: { Nombre: ['El nombre no puede exceder 50 caracteres'] },
				title: 'One or more validation errors occurred.',
				status: 400,
			},
			status: 400,
		});

		expect(extractErrorMessage(err)).toBe('El nombre no puede exceder 50 caracteres');
	});

	it('returns first message when validation errors dict has multiple fields', () => {
		const err = new HttpErrorResponse({
			error: {
				errors: {
					Nombre: ['El nombre es requerido'],
					Descripcion: ['La descripción no puede exceder 200 caracteres'],
				},
				status: 400,
			},
			status: 400,
		});

		// First field's first message wins
		expect(extractErrorMessage(err)).toBe('El nombre es requerido');
	});

	// #endregion

	// #region Fallback

	it('returns fallback for non-HttpErrorResponse unknown error', () => {
		// When the error is not an HttpErrorResponse and has no message, fallback is used
		expect(extractErrorMessage(null, 'No se pudo guardar')).toBe('No se pudo guardar');
	});

	it('returns default fallback for unknown non-HttpErrorResponse', () => {
		expect(extractErrorMessage(undefined)).toBe('Error desconocido');
	});

	it('returns non-empty string for HttpErrorResponse with no backend message', () => {
		// Angular always sets err.message on HttpErrorResponse; fallback is not reachable for HTTP errors
		const err = new HttpErrorResponse({ error: { success: false }, status: 400 });
		expect(extractErrorMessage(err, 'custom fallback')).toBeTruthy();
	});

	// #endregion

	// #region Non-HTTP errors

	it('returns error.message for plain Error', () => {
		const err = new Error('timeout');
		expect(extractErrorMessage(err)).toBe('timeout');
	});

	it('returns string as-is', () => {
		expect(extractErrorMessage('algo salió mal')).toBe('algo salió mal');
	});

	// #endregion
});
