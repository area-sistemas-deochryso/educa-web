// * Tests for classifyWalError — pure classifier mapping errors to WAL outcomes.
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { classifyWalError, extractErrorMessage } from './wal-error.utils';

describe('classifyWalError', () => {
	it('clasifica 409 Conflict como kind=conflict', () => {
		const err = new HttpErrorResponse({ status: 409, statusText: 'Conflict' });
		expect(classifyWalError(err)).toEqual({ kind: 'conflict' });
	});

	it('clasifica 400 Bad Request como kind=permanent con mensaje curado del backend, sin prefijo HTTP', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { message: 'Validación fallida' },
		});
		const result = classifyWalError(err);
		expect(result.kind).toBe('permanent');
		expect((result as { kind: 'permanent'; message: string }).message).toBe(
			'Validación fallida',
		);
	});

	it('clasifica 429 Too Many Requests como kind=permanent (no se reintenta)', () => {
		const err = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
		expect(classifyWalError(err).kind).toBe('permanent');
	});

	it('clasifica 401 Unauthorized como kind=retryable (token refresh)', () => {
		const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
		expect(classifyWalError(err)).toEqual({ kind: 'retryable' });
	});

	it('clasifica 408 Request Timeout como kind=retryable', () => {
		const err = new HttpErrorResponse({ status: 408, statusText: 'Request Timeout' });
		expect(classifyWalError(err)).toEqual({ kind: 'retryable' });
	});

	it('clasifica 500 Internal Server Error como kind=retryable', () => {
		const err = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
		expect(classifyWalError(err)).toEqual({ kind: 'retryable' });
	});

	it('clasifica error de red (status=0) como kind=retryable', () => {
		const err = new HttpErrorResponse({ status: 0, statusText: '' });
		expect(classifyWalError(err)).toEqual({ kind: 'retryable' });
	});

	it('clasifica errores no-HTTP como kind=retryable', () => {
		expect(classifyWalError(new Error('boom'))).toEqual({ kind: 'retryable' });
		expect(classifyWalError('string error')).toEqual({ kind: 'retryable' });
		expect(classifyWalError(null)).toEqual({ kind: 'retryable' });
	});
});

describe('extractErrorMessage', () => {
	it('usa `detail` (RFC 7807 ProblemDetails) sin prefijo HTTP', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { detail: 'La suma de pesos excede 100%...' },
		});
		expect(extractErrorMessage(err)).toBe('La suma de pesos excede 100%...');
	});

	it('usa `message` (legacy ApiResponse) como fallback de `detail`, sin prefijo HTTP', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { message: 'Validación fallida' },
		});
		expect(extractErrorMessage(err)).toBe('Validación fallida');
	});

	it('usa `mensaje` como fallback, sin prefijo HTTP', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { mensaje: 'Mensaje en español' },
		});
		expect(extractErrorMessage(err)).toBe('Mensaje en español');
	});

	it('sin mensaje curado, cae a `error.error` con prefijo HTTP', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { error: 'raw error string' },
		});
		expect(extractErrorMessage(err)).toBe('HTTP 400: raw error string');
	});

	it('sin body de error, cae a statusText con prefijo HTTP', () => {
		const err = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
		expect(extractErrorMessage(err)).toBe('HTTP 500: Server Error');
	});

	it('status=0 devuelve "Network error"', () => {
		const err = new HttpErrorResponse({ status: 0, statusText: '' });
		expect(extractErrorMessage(err)).toBe('Network error');
	});

	it('errores no-HTTP delegan a Error.message o String(error)', () => {
		expect(extractErrorMessage(new Error('boom'))).toBe('boom');
		expect(extractErrorMessage('string error')).toBe('string error');
	});
});
