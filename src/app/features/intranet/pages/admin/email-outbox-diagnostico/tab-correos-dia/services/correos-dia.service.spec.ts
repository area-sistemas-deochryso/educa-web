import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { DiagnosticoCorreosDiaDto } from '../models/correos-dia.models';

import { CorreosDiaService } from './correos-dia.service';

describe('CorreosDiaService', () => {
	const apiBase = `${environment.apiUrl}/api/sistema/asistencia`;
	let service: CorreosDiaService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CorreosDiaService, provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(CorreosDiaService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('obtenerDiagnostico sin params hace GET sin fecha ni sedeId', () => {
		const expected = { fecha: '2026-04-27' } as DiagnosticoCorreosDiaDto;
		service.obtenerDiagnostico().subscribe((r) => expect(r).toBe(expected));

		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/diagnostico-correos-dia` &&
				!r.params.has('fecha') &&
				!r.params.has('sedeId'),
		);
		expect(req.request.method).toBe('GET');
		req.flush(expected);
	});

	it('obtenerDiagnostico con fecha incluye query param fecha', () => {
		service.obtenerDiagnostico('2026-04-20').subscribe();

		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/diagnostico-correos-dia` &&
				r.params.get('fecha') === '2026-04-20',
		);
		req.flush({});
	});

	it('obtenerDiagnostico con sedeId incluye query param sedeId', () => {
		service.obtenerDiagnostico('2026-04-20', 7).subscribe();

		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/diagnostico-correos-dia` &&
				r.params.get('fecha') === '2026-04-20' &&
				r.params.get('sedeId') === '7',
		);
		req.flush({});
	});
});
