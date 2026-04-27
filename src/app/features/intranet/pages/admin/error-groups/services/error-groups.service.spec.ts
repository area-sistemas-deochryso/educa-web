import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { ErrorGroupsService } from './error-groups.service';
import {
	CambiarEstadoErrorGroup,
	ErrorGroupDetalle,
	ErrorGroupLista,
	OcurrenciaLista,
} from '../models';

describe('ErrorGroupsService', () => {
	const apiBase = `${environment.apiUrl}/api/sistema/error-groups`;
	const apiLegacy = `${environment.apiUrl}/api/sistema/errors`;
	let service: ErrorGroupsService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				ErrorGroupsService,
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		service = TestBed.inject(ErrorGroupsService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('getList llama GET con todos los params filtros + paginación', () => {
		const expected: ErrorGroupLista[] = [];
		service.getList('NUEVO', 'CRITICAL', 'BACKEND', 'foo', 2, 30).subscribe((r) => {
			expect(r).toEqual(expected);
		});
		const req = httpMock.expectOne(
			(r) =>
				r.url === apiBase &&
				r.params.get('estado') === 'NUEVO' &&
				r.params.get('severidad') === 'CRITICAL' &&
				r.params.get('origen') === 'BACKEND' &&
				r.params.get('q') === 'foo' &&
				r.params.get('pagina') === '2' &&
				r.params.get('pageSize') === '30',
		);
		expect(req.request.method).toBe('GET');
		req.flush(expected);
	});

	it('getList sin filtros omite params opcionales', () => {
		service.getList(null, null, null, null, 1, 20).subscribe();
		const req = httpMock.expectOne(
			(r) => r.url === apiBase && !r.params.has('estado') && !r.params.has('severidad'),
		);
		expect(req.request.params.get('pagina')).toBe('1');
		req.flush([]);
	});

	it('getCount llama GET /count y retorna number', () => {
		service.getCount('NUEVO', null, null, 'q').subscribe((n) => {
			expect(n).toBe(42);
		});
		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/count` &&
				r.params.get('estado') === 'NUEVO' &&
				r.params.get('q') === 'q',
		);
		req.flush(42);
	});

	it('getDetalle llama GET /{id}', () => {
		const detalle = { id: 5 } as ErrorGroupDetalle;
		service.getDetalle(5).subscribe((r) => expect(r).toBe(detalle));
		const req = httpMock.expectOne(`${apiBase}/5`);
		expect(req.request.method).toBe('GET');
		req.flush(detalle);
	});

	it('getOcurrencias llama GET /{id}/ocurrencias con paginación', () => {
		const items: OcurrenciaLista[] = [];
		service.getOcurrencias(5, 2, 50).subscribe();
		const req = httpMock.expectOne(
			(r) =>
				r.url === `${apiBase}/5/ocurrencias` &&
				r.params.get('pagina') === '2' &&
				r.params.get('pageSize') === '50',
		);
		expect(req.request.method).toBe('GET');
		req.flush(items);
	});

	it('cambiarEstado llama PATCH con body correcto', () => {
		const dto: CambiarEstadoErrorGroup = {
			estado: 'VISTO',
			observacion: 'ok',
			rowVersion: 'AAAA',
		};
		service.cambiarEstado(5, dto).subscribe();
		const req = httpMock.expectOne(`${apiBase}/5/estado`);
		expect(req.request.method).toBe('PATCH');
		expect(req.request.body).toEqual(dto);
		req.flush('Estado actualizado');
	});

	it('getOcurrenciaCompleta usa el endpoint legacy /api/sistema/errors/{id}', () => {
		service.getOcurrenciaCompleta(99).subscribe();
		const req = httpMock.expectOne(`${apiLegacy}/99`);
		expect(req.request.method).toBe('GET');
		req.flush({});
	});
});
