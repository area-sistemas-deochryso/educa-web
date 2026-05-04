// * Tests for classifyWalError — pure classifier mapping errors to WAL outcomes.
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { classifyWalError } from './wal-error.utils';

describe('classifyWalError', () => {
	it('clasifica 409 Conflict como kind=conflict', () => {
		const err = new HttpErrorResponse({ status: 409, statusText: 'Conflict' });
		expect(classifyWalError(err)).toEqual({ kind: 'conflict' });
	});

	it('clasifica 400 Bad Request como kind=permanent con mensaje extraído', () => {
		const err = new HttpErrorResponse({
			status: 400,
			statusText: 'Bad Request',
			error: { message: 'Validación fallida' },
		});
		const result = classifyWalError(err);
		expect(result.kind).toBe('permanent');
		expect((result as { kind: 'permanent'; message: string }).message).toContain('400');
		expect((result as { kind: 'permanent'; message: string }).message).toContain(
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
