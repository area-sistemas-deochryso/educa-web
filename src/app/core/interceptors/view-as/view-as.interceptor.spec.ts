// * Tests for viewAsInterceptor (P92 F2) — headers only travel with an
// * active context, and only on GET, matching the backend's read-only gate.
// #region Imports
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { viewAsInterceptor } from './view-as.interceptor';
import { ViewAsContextService } from '@core/services/view-as';

// #endregion

// #region Tests
describe('viewAsInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;
	let viewAsContext: ViewAsContextService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(withInterceptors([viewAsInterceptor])),
				provideHttpClientTesting(),
			],
		});

		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
		viewAsContext = TestBed.inject(ViewAsContextService);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('does not add headers when there is no active context', () => {
		http.get('/api/test').subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.has('X-View-As-Entity-Id')).toBe(false);
		expect(req.request.headers.has('X-View-As-Rol')).toBe(false);
		req.flush({});
	});

	it('adds both headers to a GET request when a context is active', () => {
		viewAsContext.setContext({ entityId: 42, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		http.get('/api/test').subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.get('X-View-As-Entity-Id')).toBe('42');
		expect(req.request.headers.get('X-View-As-Rol')).toBe('Profesor');
		req.flush({});
	});

	it('does NOT add headers to a POST request even with an active context', () => {
		viewAsContext.setContext({ entityId: 42, rol: 'Estudiante', nombreCompleto: 'Ana López' });

		http.post('/api/test', {}).subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.has('X-View-As-Entity-Id')).toBe(false);
		expect(req.request.headers.has('X-View-As-Rol')).toBe(false);
		req.flush({});
	});
});
// #endregion
