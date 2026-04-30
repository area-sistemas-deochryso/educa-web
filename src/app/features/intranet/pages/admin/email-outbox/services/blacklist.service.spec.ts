import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { BlacklistService } from './blacklist.service';

describe('BlacklistService', () => {
	let service: BlacklistService;
	let httpMock: HttpTestingController;
	const apiBase = `${environment.apiUrl}/api/sistema/email-blacklist`;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), BlacklistService],
		});
		service = TestBed.inject(BlacklistService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('getPaginado adjunta page/pageSize + filtros opcionales', () => {
		service
			.getPaginado(
				{ estado: 'activa', motivo: 'BOUNCE_5XX', q: 'gmail' },
				2,
				50,
			)
			.subscribe();

		const req = httpMock.expectOne(
			(r) =>
				r.url === apiBase &&
				r.params.get('page') === '2' &&
				r.params.get('pageSize') === '50' &&
				r.params.get('estado') === 'activa' &&
				r.params.get('motivo') === 'BOUNCE_5XX' &&
				r.params.get('q') === 'gmail',
		);
		expect(req.request.method).toBe('GET');
		req.flush({ data: [], page: 2, pageSize: 50, total: 0 });
	});

	it('getPaginado omite filtros vacíos del query string', () => {
		service.getPaginado({ estado: null, motivo: null, q: null }, 1, 20).subscribe();

		const req = httpMock.expectOne(
			(r) => r.url === apiBase && !r.params.has('estado') && !r.params.has('motivo') && !r.params.has('q'),
		);
		req.flush({ data: [], page: 1, pageSize: 20, total: 0 });
	});

	it('crear hace POST con el payload', () => {
		service
			.crear({ correo: 'foo@x.com', motivo: 'MANUAL', observacion: 'test' })
			.subscribe();

		const req = httpMock.expectOne(apiBase);
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toEqual({ correo: 'foo@x.com', motivo: 'MANUAL', observacion: 'test' });
		req.flush({});
	});

	it('despejar hace DELETE con el correo URI-encoded', () => {
		service.despejar('user+tag@gmail.com').subscribe();

		const req = httpMock.expectOne(`${apiBase}/${encodeURIComponent('user+tag@gmail.com')}`);
		expect(req.request.method).toBe('DELETE');
		req.flush({});
	});
});
