import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@config/environment';

import { PagosApiService } from './pagos-api.service';

const API = `${environment.apiUrl}/api/pagos`;
const SIN_TOAST = 'X-Skip-Error-Toast';

describe('PagosApiService · generar cargos de un alumno (P123 F7/F8)', () => {
	let service: PagosApiService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		service = TestBed.inject(PagosApiService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('la vista previa por alumno envía año, alumno y esNuevo, y el error se muestra en línea', () => {
		service.vistaPreviaGeneracionAlumno({ anio: 2027, estudianteId: 15, esNuevo: true }).subscribe();

		const req = http.expectOne(`${API}/cargos/generar/alumno/vista-previa`);
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toEqual({ anio: 2027, estudianteId: 15, esNuevo: true });
		expect(req.request.headers.get(SIN_TOAST)).toBe('true');
		req.flush({});
	});

	it('generar por alumno añade crearEsperados al cuerpo', () => {
		service.generarCargosAlumno({ anio: 2027, estudianteId: 15, esNuevo: false }, 1).subscribe();

		const req = http.expectOne(`${API}/cargos/generar/alumno`);
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toEqual({ anio: 2027, estudianteId: 15, esNuevo: false, crearEsperados: 1 });
		req.flush({});
	});

	it('el aviso suave consulta el alumno y manda el año solo si se da', () => {
		service.matriculaSinCargo(15, 2027).subscribe();
		const conAnio = http.expectOne((r) => r.url === `${API}/estudiantes/15/matricula-sin-cargo`);
		expect(conAnio.request.params.get('anio')).toBe('2027');
		conAnio.flush({});

		service.matriculaSinCargo(15).subscribe();
		const sinAnio = http.expectOne((r) => r.url === `${API}/estudiantes/15/matricula-sin-cargo`);
		expect(sinAnio.request.params.has('anio')).toBe(false);
		sinAnio.flush({});
	});
});
