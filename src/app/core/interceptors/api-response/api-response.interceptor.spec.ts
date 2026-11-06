// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { apiResponseInterceptor } from './api-response.interceptor';
// #endregion

// #region Tests
describe('apiResponseInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([apiResponseInterceptor])),
				provideHttpClientTesting(),
			],
		});
		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	function call(body: unknown): unknown {
		let result: unknown = 'unset';
		http.get('/api/x').subscribe((r) => (result = r));
		httpMock.expectOne('/api/x').flush(body);
		return result;
	}

	it('devuelve data cuando success=true y data existe', () => {
		expect(call({ success: true, data: { id: 1 } })).toEqual({ id: 1 });
	});

	it('conserva data falsy distinta de null (0, false)', () => {
		expect(call({ success: true, data: 0 })).toBe(0);
		expect(call({ success: true, data: false })).toBe(false);
	});

	it('devuelve { mensaje } cuando data es null y hay message', () => {
		expect(call({ success: true, data: null, message: 'Guardado' })).toEqual({ mensaje: 'Guardado' });
	});

	it('devuelve { mensaje } cuando data falta y hay message', () => {
		expect(call({ success: true, message: 'OK' })).toEqual({ mensaje: 'OK' });
	});

	it('devuelve null cuando no hay data ni message', () => {
		expect(call({ success: true, data: null })).toBeNull();
	});

	it('no desenvuelve cuando success=false (deja el envelope intacto)', () => {
		const body = { success: false, data: { id: 1 }, message: 'fail' };
		expect(call(body)).toEqual(body);
	});

	it('deja pasar bodies que no son ApiResponse', () => {
		expect(call({ id: 1, nombre: 'A' })).toEqual({ id: 1, nombre: 'A' });
		expect(call([1, 2, 3])).toEqual([1, 2, 3]);
		expect(call('texto')).toBe('texto');
	});

	it('deja pasar respuestas con body null', () => {
		expect(call(null)).toBeNull();
	});
});
// #endregion
