// * Tests for ErrorHandlerService — validates error state and notifications.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from './error-handler.service';

// #endregion

// #region Tests
describe('ErrorHandlerService', () => {
	let service: ErrorHandlerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ErrorHandlerService],
		});
		service = TestBed.inject(ErrorHandlerService);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have no errors', () => {
			expect(service.errors()).toEqual([]);
			expect(service.hasErrors()).toBe(false);
			expect(service.lastError()).toBeNull();
			expect(service.currentNotification()).toBeNull();
		});

		it('should have zero error counts', () => {
			expect(service.errorCounts()).toEqual({ http: 0, client: 0, validation: 0 });
		});
	});
	// #endregion

	// #region handleHttpError
	describe('handleHttpError', () => {
		it('should create error from HttpErrorResponse', () => {
			const httpError = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error', url: '/api/test' });

			const appError = service.handleHttpError(httpError);

			expect(appError.source).toBe('http');
			expect(appError.severity).toBe('error');
			expect(appError.statusCode).toBe(500);
			expect(service.errors()).toHaveLength(1);
			expect(service.hasErrors()).toBe(true);
		});

		it('should show notification', () => {
			const httpError = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
			service.handleHttpError(httpError);

			expect(service.currentNotification()).not.toBeNull();
			expect(service.currentNotification()!.severity).toBe('error');
		});

		it('should append traceId reference for 500+ errors', () => {
			const httpError = new HttpErrorResponse({ status: 500, statusText: 'Error' });
			const appError = service.handleHttpError(httpError, { traceId: 'abc12345-long-trace-id' });

			expect(appError.message).toContain('Ref: abc12345');
		});

		it('should count http errors', () => {
			service.handleHttpError(new HttpErrorResponse({ status: 500 }));
			service.handleHttpError(new HttpErrorResponse({ status: 404 }));

			expect(service.errorCounts().http).toBe(2);
		});
	});
	// #endregion

	// #region handleClientError
	describe('handleClientError', () => {
		it('should create client error', () => {
			const error = new Error('Something broke');
			const appError = service.handleClientError(error);

			expect(appError.source).toBe('client');
			expect(appError.severity).toBe('error');
			expect(service.errorCounts().client).toBe(1);
		});
	});
	// #endregion

	// #region handleValidationError
	describe('handleValidationError', () => {
		it('should create validation error with warn severity', () => {
			const appError = service.handleValidationError('Campo requerido');

			expect(appError.source).toBe('validation');
			expect(appError.severity).toBe('warn');
			expect(appError.message).toBe('Campo requerido');
			expect(service.errorCounts().validation).toBe(1);
		});
	});
	// #endregion

	// #region Notification helpers
	describe('notification helpers', () => {
		it('should show info notification', () => {
			service.showInfo('Info', 'Detalle');

			const notif = service.currentNotification();
			expect(notif?.severity).toBe('info');
			expect(notif?.summary).toBe('Info');
			expect(notif?.detail).toBe('Detalle');
		});

		it('should show success notification', () => {
			service.showSuccess('OK', 'Guardado correctamente');
			expect(service.currentNotification()?.severity).toBe('success');
		});

		it('should show warning notification', () => {
			service.showWarning('Atención', 'Revisar datos');
			expect(service.currentNotification()?.severity).toBe('warn');
		});

		it('should show error notification', () => {
			service.showError('Error', 'No se pudo guardar');
			expect(service.currentNotification()?.severity).toBe('error');
		});
	});
	// #endregion

	// #region Clear operations
	describe('clear operations', () => {
		it('should clear notification', () => {
			service.showInfo('Test', 'test');
			service.clearNotification();
			expect(service.currentNotification()).toBeNull();
		});

		it('should clear all errors', () => {
			service.handleClientError(new Error('e1'));
			service.handleClientError(new Error('e2'));

			service.clearErrors();

			expect(service.errors()).toEqual([]);
			expect(service.hasErrors()).toBe(false);
		});
	});
	// #endregion

	// #region lastError computed
	describe('lastError', () => {
		it('should return the most recent error', () => {
			service.handleValidationError('First');
			service.handleValidationError('Second');

			expect(service.lastError()!.message).toBe('Second');
		});
	});
	// #endregion

	// #region Deduplication
	describe('notification deduplication', () => {
		it('should deduplicate identical notifications within 5s', () => {
			service.showError('Error', 'Same message');
			service.showError('Error', 'Same message');

			// Should still only show one notification (deduped)
			expect(service.currentNotification()?.detail).toBe('Same message');
		});
	});
	// #endregion

	// #region Max errors cap
	describe('max errors cap', () => {
		it('should cap at 50 errors', () => {
			for (let i = 0; i < 55; i++) {
				service.handleValidationError(`Error ${i}`);
			}

			expect(service.errors().length).toBeLessThanOrEqual(50);
		});
	});
	// #endregion
});
// #endregion
