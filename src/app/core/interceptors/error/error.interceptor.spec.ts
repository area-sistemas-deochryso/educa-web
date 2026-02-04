// * Tests for error interceptor handling behavior.
import { TestBed } from '@angular/core/testing';
import {
	HttpClient,
	HttpErrorResponse,
	provideHttpClient,
	withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { errorInterceptor } from './error.interceptor';
import { ErrorHandlerService } from '@core/services/error';

describe('errorInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;
	let errorHandlerMock: Partial<ErrorHandlerService>;

	beforeEach(() => {
		errorHandlerMock = {
			handleHttpError: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should pass through successful requests', () => {
		httpClient.get('/api/test').subscribe((response) => {
			expect(response).toEqual({ success: true });
		});

		const req = httpMock.expectOne('/api/test');
		req.flush({ success: true });

		expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
	});

	it('should call errorHandler for non-login HTTP errors', () => {
		httpClient.get('/api/users').subscribe({
			error: (error) => {
				expect(error).toBeInstanceOf(HttpErrorResponse);
				expect(error.status).toBe(500);
			},
		});

		const req = httpMock.expectOne('/api/users');
		req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

		expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
			expect.any(HttpErrorResponse),
			expect.objectContaining({
				url: '/api/users',
				method: 'GET',
			}),
		);
	});

	it('should NOT call errorHandler for login endpoint errors', () => {
		httpClient.post('/api/Auth/login', {}).subscribe({
			error: (error) => {
				expect(error.status).toBe(401);
			},
		});

		const req = httpMock.expectOne('/api/Auth/login');
		req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

		expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
	});

	it('should NOT call errorHandler for verificar endpoint errors', () => {
		httpClient.post('/api/Auth/verificar', {}).subscribe({
			error: (error) => {
				expect(error.status).toBe(401);
			},
		});

		const req = httpMock.expectOne('/api/Auth/verificar');
		req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

		expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
	});

	it('should handle 404 errors', () => {
		httpClient.get('/api/not-found').subscribe({
			error: (error) => {
				expect(error.status).toBe(404);
			},
		});

		const req = httpMock.expectOne('/api/not-found');
		req.flush('Not Found', { status: 404, statusText: 'Not Found' });

		expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
	});

	it('should handle 403 Forbidden errors', () => {
		httpClient.get('/api/forbidden').subscribe({
			error: (error) => {
				expect(error.status).toBe(403);
			},
		});

		const req = httpMock.expectOne('/api/forbidden');
		req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

		expect(errorHandlerMock.handleHttpError).toHaveBeenCalled();
	});

	it('should pass request body to errorHandler', () => {
		const requestBody = { username: 'test', data: 'value' };

		httpClient.post('/api/data', requestBody).subscribe({
			error: () => {},
		});

		const req = httpMock.expectOne('/api/data');
		req.flush('Error', { status: 400, statusText: 'Bad Request' });

		expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
			expect.any(HttpErrorResponse),
			expect.objectContaining({
				method: 'POST',
				body: requestBody,
			}),
		);
	});
});
