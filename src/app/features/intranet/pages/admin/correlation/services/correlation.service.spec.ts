import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { CorrelationSnapshot } from '../models';
import { CorrelationService } from './correlation.service';

describe('CorrelationService', () => {
	let service: CorrelationService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), CorrelationService],
		});
		service = TestBed.inject(CorrelationService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('hits GET /api/sistema/correlation/{id} with url-encoded id and returns the snapshot', () => {
		const snapshot: CorrelationSnapshot = {
			correlationId: 'abc/12 3',
			generatedAt: '2026-04-25T10:00:00',
			errorLogs: [],
			rateLimitEvents: [],
			reportesUsuario: [],
			emailOutbox: [],
		};

		let actual: CorrelationSnapshot | null = null;
		service.getSnapshot('abc/12 3').subscribe((s) => (actual = s));

		const req = httpMock.expectOne(
			`${environment.apiUrl}/api/sistema/correlation/${encodeURIComponent('abc/12 3')}`,
		);
		expect(req.request.method).toBe('GET');
		req.flush(snapshot);

		expect(actual).toEqual(snapshot);
		httpMock.verify();
	});

	it('hits GET /api/sistema/correlation/search with only the set filters as query params', () => {
		let actual: string[] | null = null;
		service
			.search({ query: 'timeout', dni: '5678', desde: null, hasta: undefined })
			.subscribe((ids) => (actual = ids));

		const req = httpMock.expectOne(
			(r) => r.url === `${environment.apiUrl}/api/sistema/correlation/search`,
		);
		expect(req.request.method).toBe('GET');
		expect(req.request.params.get('query')).toBe('timeout');
		expect(req.request.params.get('dni')).toBe('5678');
		expect(req.request.params.has('desde')).toBe(false);
		expect(req.request.params.has('hasta')).toBe(false);
		req.flush(['trace-1', 'trace-2']);

		expect(actual).toEqual(['trace-1', 'trace-2']);
		httpMock.verify();
	});
});
