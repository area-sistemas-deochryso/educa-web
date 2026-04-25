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
});
