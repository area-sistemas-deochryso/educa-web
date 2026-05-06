import { TestBed } from '@angular/core/testing';
import {
	HttpTestingController,
	provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it, afterEach } from 'vitest';

import { EmailDeferEventsService } from './email-defer-events.service';

describe('EmailDeferEventsService', () => {
	let service: EmailDeferEventsService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				EmailDeferEventsService,
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		service = TestBed.inject(EmailDeferEventsService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('aplica todos los filtros (desde/hasta/tipo/dominio) en la query string', () => {
		service
			.getPaginado(
				{
					desde: '2026-04-29T00:00:00.000Z',
					hasta: '2026-04-30T00:00:00.000Z',
					tipo: 'DOMAIN_BLOCKED',
					dominio: 'gmail.com',
				},
				1,
				25,
			)
			.subscribe();

		const req = httpMock.expectOne((r) =>
			r.url.endsWith('/api/sistema/email-outbox/defer-events'),
		);
		expect(req.request.params.get('page')).toBe('1');
		expect(req.request.params.get('pageSize')).toBe('25');
		expect(req.request.params.get('desde')).toBe('2026-04-29T00:00:00.000Z');
		expect(req.request.params.get('hasta')).toBe('2026-04-30T00:00:00.000Z');
		expect(req.request.params.get('tipo')).toBe('DOMAIN_BLOCKED');
		expect(req.request.params.get('dominio')).toBe('gmail.com');
		req.flush({ data: [], page: 1, pageSize: 25, total: 0 });
	});

	it('omite parámetros nulos', () => {
		service
			.getPaginado({ desde: null, hasta: null, tipo: null, dominio: null }, 2, 10)
			.subscribe();

		const req = httpMock.expectOne((r) =>
			r.url.endsWith('/api/sistema/email-outbox/defer-events'),
		);
		expect(req.request.params.has('desde')).toBe(false);
		expect(req.request.params.has('tipo')).toBe(false);
		expect(req.request.params.has('dominio')).toBe(false);
		req.flush({ data: [], page: 2, pageSize: 10, total: 0 });
	});

	describe('getCatalogoTipos', () => {
		it('llama al endpoint /tipos y retorna el array', () => {
			let received: string[] | undefined;
			service.getCatalogoTipos().subscribe((tipos) => {
				received = tipos;
			});

			const req = httpMock.expectOne((r) =>
				r.url.endsWith('/api/sistema/email-outbox/defer-events/tipos'),
			);
			expect(req.request.method).toBe('GET');
			req.flush(['WARNING_DELAYED_24H', 'DOMAIN_BLOCKED']);

			expect(received).toEqual(['WARNING_DELAYED_24H', 'DOMAIN_BLOCKED']);
		});

		it('cachea el resultado: la segunda subscripción no dispara una nueva request', () => {
			service.getCatalogoTipos().subscribe();

			const req = httpMock.expectOne((r) =>
				r.url.endsWith('/api/sistema/email-outbox/defer-events/tipos'),
			);
			req.flush(['WARNING_DELAYED_24H']);

			let received: string[] | undefined;
			service.getCatalogoTipos().subscribe((tipos) => {
				received = tipos;
			});

			// shareReplay sirve el valor cacheado — no hay nueva request HTTP.
			httpMock.expectNone((r) => r.url.endsWith('/defer-events/tipos'));
			expect(received).toEqual(['WARNING_DELAYED_24H']);
		});
	});
});
