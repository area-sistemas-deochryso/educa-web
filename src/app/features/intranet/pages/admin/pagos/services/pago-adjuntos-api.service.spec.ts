import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PagoAdjuntosApiService } from './pago-adjuntos-api.service';

describe('PagoAdjuntosApiService', () => {
	let service: PagoAdjuntosApiService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		service = TestBed.inject(PagoAdjuntosApiService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('lista los adjuntos del pago sin toast global', () => {
		service.listar(7).subscribe();
		const req = http.expectOne((r) => r.url.endsWith('/api/pagos/7/adjuntos'));
		expect(req.request.method).toBe('GET');
		expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
		req.flush([]);
	});

	it('sube el archivo como multipart en el campo «archivo»', () => {
		const archivo = new File(['%PDF'], 'v.pdf', { type: 'application/pdf' });
		service.subir(7, archivo).subscribe();
		const req = http.expectOne((r) => r.url.endsWith('/api/pagos/7/adjuntos'));
		expect(req.request.method).toBe('POST');
		const cuerpo = req.request.body as FormData;
		expect(cuerpo.get('archivo')).toBeInstanceOf(File);
		expect((cuerpo.get('archivo') as File).name).toBe('v.pdf');
		req.flush({});
	});

	it('descarga como blob y toma el nombre de Content-Disposition (o el original si falta)', () => {
		let nombre = '';
		service.descargar(7, 3, 'original.pdf').subscribe((a) => (nombre = a.fileName));
		const req = http.expectOne((r) => r.url.endsWith('/api/pagos/7/adjuntos/3'));
		expect(req.request.responseType).toBe('blob');
		req.flush(new Blob(['x']), { headers: { 'Content-Disposition': 'attachment; filename="voucher%20final.pdf"' } });
		expect(nombre).toBe('voucher final.pdf');

		service.descargar(7, 4, 'original.pdf').subscribe((a) => (nombre = a.fileName));
		http.expectOne((r) => r.url.endsWith('/api/pagos/7/adjuntos/4')).flush(new Blob(['x']));
		expect(nombre).toBe('original.pdf');
	});

	it('da de baja con el motivo en el cuerpo', () => {
		service.darDeBaja(7, 3, 'duplicado').subscribe();
		const req = http.expectOne((r) => r.url.endsWith('/api/pagos/7/adjuntos/3/baja'));
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toEqual({ motivo: 'duplicado' });
		req.flush({});
	});
});
