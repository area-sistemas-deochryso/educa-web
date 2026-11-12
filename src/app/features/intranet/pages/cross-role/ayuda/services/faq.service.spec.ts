import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';
import { FaqService } from './faq.service';

const FAQ_API = `${environment.apiUrl}/api/faq`;

describe('FaqService', () => {
	let service: FaqService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		service = TestBed.inject(FaqService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('la lectura principal no es silenciosa', () => {
		service.getFaqs().subscribe();

		const req = httpMock.expectOne(FAQ_API);

		expect(req.request.headers.has('X-Skip-Error-Toast')).toBe(false);
	});

	it('«más consultadas» pide orden=consultas sin toast de error', () => {
		service.getFaqsMasConsultadas().subscribe();

		const req = httpMock.expectOne((r) => r.url === FAQ_API);

		expect(req.request.params.get('orden')).toBe('consultas');
		expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
	});

	it('votar envía `util` y el motivo solo en «No útil»', () => {
		service.votar(5, false, 'DESACTUALIZADA').subscribe();
		const noUtil = httpMock.expectOne(`${FAQ_API}/5/feedback`);
		expect(noUtil.request.method).toBe('PUT');
		expect(noUtil.request.body).toEqual({ util: false, motivo: 'DESACTUALIZADA' });
		expect(noUtil.request.headers.get('X-Skip-Error-Toast')).toBe('true');

		service.votar(5, true, 'DESACTUALIZADA').subscribe();
		expect(httpMock.expectOne(`${FAQ_API}/5/feedback`).request.body).toEqual({ util: true });

		service.votar(5, false, null).subscribe();
		expect(httpMock.expectOne(`${FAQ_API}/5/feedback`).request.body).toEqual({ util: false });
	});

	it('registrarApertura hace POST sin cuerpo y sin toast de error', () => {
		service.registrarApertura(7).subscribe();

		const req = httpMock.expectOne(`${FAQ_API}/7/apertura`);

		expect(req.request.method).toBe('POST');
		expect(req.request.body).toBeNull();
		expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
	});

	it('misVotos lee los votos propios sin toast de error', () => {
		service.misVotos().subscribe();

		const req = httpMock.expectOne(`${FAQ_API}/feedback/mios`);

		expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
	});
});
