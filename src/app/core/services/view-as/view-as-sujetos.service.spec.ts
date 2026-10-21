// * Tests for ViewAsSujetosService (P115 F1/F3) — contract with GET api/view-as/sujetos.
// #region Imports
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ViewAsSujetosService } from './view-as-sujetos.service';
// #endregion

// #region Tests
describe('ViewAsSujetosService', () => {
	let service: ViewAsSujetosService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		service = TestBed.inject(ViewAsSujetosService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('buscar envía el rol en minúscula y solo los filtros presentes', () => {
		service.buscar('Profesor', 'ana', 3, undefined).subscribe();

		const req = http.expectOne((r) => r.url.endsWith('/api/view-as/sujetos'));
		expect(req.request.params.get('rol')).toBe('profesor');
		expect(req.request.params.get('termino')).toBe('ana');
		expect(req.request.params.get('salonId')).toBe('3');
		expect(req.request.params.has('cursoId')).toBe(false);
		req.flush({ usuarios: [], total: 0 });
	});

	it('buscar sin filtros solo envía el rol', () => {
		service.buscar('Estudiante').subscribe();

		const req = http.expectOne((r) => r.url.endsWith('/api/view-as/sujetos'));
		expect(req.request.params.keys()).toEqual(['rol']);
		req.flush({ usuarios: [], total: 0 });
	});

	it('obtenerCapabilities consulta por rol e id del sujeto', () => {
		let result: unknown;
		service.obtenerCapabilities('Profesor', 77).subscribe((caps) => (result = caps));

		const req = http.expectOne((r) => r.url.endsWith('/api/view-as/sujetos/profesor/77/capabilities'));
		req.flush([{ codigo: 'CURSOS_PROFESOR_PAGE_VIEW', ruta: 'intranet/profesor/cursos' }]);

		expect(result).toEqual([{ codigo: 'CURSOS_PROFESOR_PAGE_VIEW', ruta: 'intranet/profesor/cursos' }]);
	});

	it('obtenerCapabilities devuelve [] si el cuerpo no es una lista', () => {
		let result: unknown;
		service.obtenerCapabilities('Estudiante', 5).subscribe((caps) => (result = caps));

		http.expectOne((r) => r.url.endsWith('/api/view-as/sujetos/estudiante/5/capabilities')).flush(null);

		expect(result).toEqual([]);
	});

	it('obtenerCapabilities propaga el error (no lo traga): quien llama decide el fallback', () => {
		let failed = false;
		service.obtenerCapabilities('Profesor', 1).subscribe({ error: () => (failed = true) });

		http.expectOne((r) => r.url.endsWith('/capabilities')).flush('x', { status: 403, statusText: 'Forbidden' });

		expect(failed).toBe(true);
	});
});
// #endregion
