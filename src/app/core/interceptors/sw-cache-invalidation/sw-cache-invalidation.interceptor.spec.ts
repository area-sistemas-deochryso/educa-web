// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SwService } from '@core/services/sw';
import { swCacheInvalidationInterceptor } from './sw-cache-invalidation.interceptor';
// #endregion

// #region Tests
describe('swCacheInvalidationInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;
	const invalidateCacheByPattern = vi.fn();

	beforeEach(() => {
		invalidateCacheByPattern.mockReset();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([swCacheInvalidationInterceptor])),
				provideHttpClientTesting(),
				{ provide: SwService, useValue: { invalidateCacheByPattern } },
			],
		});
		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	describe('métodos', () => {
		it('GET nunca invalida', () => {
			http.get('/api/sistema/usuarios').subscribe();
			httpMock.expectOne('/api/sistema/usuarios').flush([]);
			expect(invalidateCacheByPattern).not.toHaveBeenCalled();
		});

		it.each(['post', 'put', 'patch', 'delete'] as const)('%s exitoso invalida', (method) => {
			http.request(method, '/api/sistema/usuarios/crear', { body: {} }).subscribe();
			httpMock.expectOne('/api/sistema/usuarios/crear').flush({});
			expect(invalidateCacheByPattern).toHaveBeenCalledWith('/api/sistema/usuarios');
		});

		it('una mutación fallida no invalida', () => {
			http.post('/api/sistema/usuarios/crear', {}).subscribe({ error: () => undefined });
			httpMock
				.expectOne('/api/sistema/usuarios/crear')
				.flush('boom', { status: 500, statusText: 'Server Error' });
			expect(invalidateCacheByPattern).not.toHaveBeenCalled();
		});
	});

	describe('extracción del patrón', () => {
		const cases: [string, string][] = [
			['/api/sistema/usuarios/Estudiante/77', '/api/sistema/usuarios'],
			['/api/horario/5/toggle-estado', '/api/horario'],
			// El docstring del interceptor promete '/api/sistema/permisos'; el código corta recién en la acción ('crear').
			['/api/sistema/permisos/rol/crear', '/api/sistema/permisos/rol'],
			['/api/sistema/usuarios?page=1', '/api/sistema/usuarios'],
			['/api/ConsultaAsistencia/estudiante/3', '/api/ConsultaAsistencia'],
		];

		it.each(cases)('%s → %s', (url, expected) => {
			http.put(url, {}).subscribe();
			httpMock.expectOne(url).flush({});
			expect(invalidateCacheByPattern).toHaveBeenCalledWith(expected);
		});

		it('url fuera de /api/ no invalida', () => {
			http.post('/assets/upload', {}).subscribe();
			httpMock.expectOne('/assets/upload').flush({});
			expect(invalidateCacheByPattern).not.toHaveBeenCalled();
		});

		it('url con solo /api/<acción> no invalida (patrón demasiado amplio)', () => {
			http.post('/api/crear', {}).subscribe();
			httpMock.expectOne('/api/crear').flush({});
			expect(invalidateCacheByPattern).not.toHaveBeenCalled();
		});
	});
});
// #endregion
