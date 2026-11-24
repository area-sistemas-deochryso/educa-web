import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';
import type {
	ConfiguracionAnio,
	GenerarCargosPayload,
	GuardarCronogramaAnioPayload,
	GuardarMontosAnioPayload,
	GuardarParametroAnioPayload,
} from '@data/models';

import { PagosApiService } from './pagos-api.service';

const API = `${environment.apiUrl}/api/pagos`;
const SIN_TOAST = 'X-Skip-Error-Toast';

const CONFIGURACION: ConfiguracionAnio = {
	anio: 2027,
	conceptos: [
		{
			conceptoId: 1,
			codigo: 'MATRICULA',
			nombre: 'Matricula',
			soloAlumnosNuevos: false,
			montos: [{ conceptoId: 1, monto: 320, rowVersion: 'AAAA' }],
		},
	],
	cronograma: [
		{
			numero: 1,
			etiqueta: 'Marzo',
			fechaVencimiento: '2027-03-31T00:00:00',
			rowVersion: 'AAAB',
		},
	],
};

describe('PagosApiService · configuración del año (P123 F2)', () => {
	let service: PagosApiService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(PagosApiService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('configuracionAnio lee el año sin toast de error y emite la configuración', () => {
		let recibida: ConfiguracionAnio | undefined;
		service.configuracionAnio(2027).subscribe((cfg) => (recibida = cfg));

		const req = http.expectOne(`${API}/configuracion/2027`);
		expect(req.request.method).toBe('GET');
		expect(req.request.headers.get(SIN_TOAST)).toBe('true');
		req.flush(CONFIGURACION);

		expect(recibida).toEqual(CONFIGURACION);
	});

	it('guardarMontosAnio hace PUT con las filas enviadas y sin toast de error (INV-PG06, INV-S05)', () => {
		const payload: GuardarMontosAnioPayload = {
			anio: 2027,
			montos: [
				{ conceptoId: 1, nivel: null, monto: 320, rowVersion: 'AAAA' },
				{ conceptoId: 3, nivel: 'Primaria', monto: 0.3, rowVersion: null },
			],
		};
		let recibida: ConfiguracionAnio | undefined;
		service.guardarMontosAnio(payload).subscribe((cfg) => (recibida = cfg));

		const req = http.expectOne(`${API}/configuracion/montos`);
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toEqual(payload);
		expect(req.request.headers.get(SIN_TOAST)).toBe('true');
		req.flush(CONFIGURACION);

		expect(recibida).toEqual(CONFIGURACION);
	});

	it('guardarCronogramaAnio hace PUT con las cuotas y sin toast de error (INV-PG05)', () => {
		const payload: GuardarCronogramaAnioPayload = {
			anio: 2027,
			cuotas: [
				{ numero: 1, etiqueta: 'Marzo', fechaVencimiento: '2027-03-31', rowVersion: null },
			],
		};
		let recibida: ConfiguracionAnio | undefined;
		service.guardarCronogramaAnio(payload).subscribe((cfg) => (recibida = cfg));

		const req = http.expectOne(`${API}/configuracion/cronograma`);
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toEqual(payload);
		expect(req.request.headers.get(SIN_TOAST)).toBe('true');
		req.flush(CONFIGURACION);

		expect(recibida).toEqual(CONFIGURACION);
	});

	it('los parámetros del año se leen y guardan sin toast de error: la sección muestra el error en línea', () => {
		service.parametrosAnio(2027).subscribe();
		const get = http.expectOne(`${API}/parametros/2027`);
		expect(get.request.method).toBe('GET');
		expect(get.request.headers.get(SIN_TOAST)).toBe('true');

		const payload: GuardarParametroAnioPayload = {
			anio: 2027,
			pagoMinimoPartes: 20,
			montoRecargo: 5,
			fechaInicial: null,
			rowVersion: null,
		};
		service.guardarParametrosAnio(payload).subscribe();
		const put = http.expectOne(`${API}/parametros`);
		expect(put.request.method).toBe('PUT');
		expect(put.request.body).toEqual(payload);
		expect(put.request.headers.get(SIN_TOAST)).toBe('true');
	});

	it('la vista previa y la generación de cargos siguen con el toast global', () => {
		const payload: GenerarCargosPayload = {
			anio: 2027,
			conceptos: ['MATRICULA'],
			salonId: null,
			inscripcionEstudianteIds: null,
		};
		service.vistaPreviaGeneracion(payload).subscribe();
		const vistaPrevia = http.expectOne(`${API}/cargos/generar/vista-previa`);
		expect(vistaPrevia.request.headers.has(SIN_TOAST)).toBe(false);

		service.generarCargos(payload, 10).subscribe();
		const generar = http.expectOne(`${API}/cargos/generar`);
		expect(generar.request.headers.has(SIN_TOAST)).toBe(false);
	});
});
