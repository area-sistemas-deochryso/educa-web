import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import { PagosApiService } from './pagos-api.service';
import { ConstanciaPagoFacade, mensajeConstanciaError } from './constancia-pago.facade';

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('@core/helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('@core/helpers')>()),
	downloadBlob,
}));

describe('ConstanciaPagoFacade', () => {
	let facade: ConstanciaPagoFacade;
	const api = { constancia: vi.fn() };

	beforeEach(() => {
		downloadBlob.mockReset();
		api.constancia.mockReset().mockReturnValue(of({ blob: new Blob(['%PDF']), fileName: 'Constancia_Pago_5.pdf' }));
		TestBed.configureTestingModule({
			providers: [ConstanciaPagoFacade, { provide: PagosApiService, useValue: api }],
		});
		facade = TestBed.inject(ConstanciaPagoFacade);
	});

	it('descarga el PDF con el nombre que manda el servidor y libera el estado', () => {
		facade.descargar(5);
		expect(api.constancia).toHaveBeenCalledWith(5);
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Constancia_Pago_5.pdf');
		expect(facade.descargando()).toBeNull();
		expect(facade.error()).toBeNull();
	});

	it('marca el pago en descarga y ignora una segunda petición mientras tanto', () => {
		const pendiente = new Subject<{ blob: Blob; fileName: string }>();
		api.constancia.mockReturnValue(pendiente);
		facade.descargar(5);
		facade.descargar(6);
		expect(facade.descargando()).toBe(5);
		expect(api.constancia).toHaveBeenCalledTimes(1);
		pendiente.next({ blob: new Blob(['x']), fileName: 'c.pdf' });
		pendiente.complete();
		expect(facade.descargando()).toBeNull();
	});

	it.each([
		[0, 'No hay conexión'],
		[403, 'No tienes permiso'],
		[404, 'No se encontró el pago'],
		[429, 'muchas descargas'],
		[500, 'No se pudo descargar'],
	])('con status %i muestra un mensaje en línea y no descarga nada', (status, texto) => {
		api.constancia.mockReturnValue(throwError(() => ({ status })));
		facade.descargar(5);
		expect(facade.error()).toContain(texto);
		expect(downloadBlob).not.toHaveBeenCalled();
		expect(facade.descargando()).toBeNull();
	});

	it('un intento nuevo borra el error anterior', () => {
		api.constancia.mockReturnValueOnce(throwError(() => ({ status: 0 })));
		facade.descargar(5);
		expect(facade.error()).not.toBeNull();
		facade.descargar(5);
		expect(facade.error()).toBeNull();
	});

	it('mensajeConstanciaError tolera un error sin status', () => {
		expect(mensajeConstanciaError(null)).toContain('No se pudo descargar');
	});
});
