import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { EmailDiagnosticoDto } from '../models/correo-individual.models';

import { CorreoIndividualService } from './correo-individual.service';

describe('CorreoIndividualService', () => {
	const apiBase = `${environment.apiUrl}/api/sistema/email-outbox`;
	let service: CorreoIndividualService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CorreoIndividualService, provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(CorreoIndividualService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('obtenerDiagnostico hace GET /diagnostico con query param correo', () => {
		const expected = { correoConsultado: 'a@b.com' } as EmailDiagnosticoDto;
		service.obtenerDiagnostico('a@b.com').subscribe((r) => expect(r).toBe(expected));

		const req = httpMock.expectOne(
			(r) => r.url === `${apiBase}/diagnostico` && r.params.get('correo') === 'a@b.com',
		);
		expect(req.request.method).toBe('GET');
		req.flush(expected);
	});

	it('obtenerDiagnostico URL-encodea el "+" en correos con plus addressing', () => {
		service.obtenerDiagnostico('user+tag@example.com').subscribe();

		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/diagnostico` &&
				r.params.get('correo') === 'user+tag@example.com',
		);
		// HttpParams encodea "+" → "%2B" para que el BE no lo malinterprete como espacio
		expect(req.request.urlWithParams).toContain('correo=user%2Btag');
		req.flush({});
	});

	it('propaga error 400 con errorCode CORREO_INVALIDO desde el BE', () => {
		let capturedStatus = 0;
		service.obtenerDiagnostico('no-arroba').subscribe({
			next: () => {
				throw new Error('debió fallar');
			},
			error: (err) => {
				capturedStatus = err.status;
			},
		});

		const req = httpMock.expectOne(
			(r) => r.url === `${apiBase}/diagnostico` && r.params.get('correo') === 'no-arroba',
		);
		req.flush(
			{ errorCode: 'CORREO_INVALIDO', message: 'El parámetro correo no tiene un formato válido' },
			{ status: 400, statusText: 'Bad Request' },
		);

		expect(capturedStatus).toBe(400);
	});
});
