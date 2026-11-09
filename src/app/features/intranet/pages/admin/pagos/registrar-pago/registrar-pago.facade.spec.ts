import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { EstudianteBusqueda } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { RegistrarPagoFacade } from './registrar-pago.facade';

const ana: EstudianteBusqueda = { estudianteId: 280, nombreCompleto: 'Pérez, Ana', salon: { nombre: '5TO PRIMARIA B' } };

function crearFacade() {
	const buscarEstudiantes = vi.fn(() => of([ana]));
	TestBed.configureTestingModule({
		providers: [
			RegistrarPagoFacade,
			{ provide: PagosApiService, useValue: { buscarEstudiantes, familia: () => of([]) } },
		],
	});
	return { facade: TestBed.inject(RegistrarPagoFacade), buscarEstudiantes };
}

describe('RegistrarPagoFacade — buscador de alumnos', () => {
	it('no consulta con menos de 2 caracteres y vacía las sugerencias', () => {
		const { facade, buscarEstudiantes } = crearFacade();
		facade.buscarEstudiantes('pe');
		facade.buscarEstudiantes(' a ');

		expect(buscarEstudiantes).toHaveBeenCalledTimes(1);
		expect(facade.sugerencias()).toEqual([]);
	});

	it('consulta con el texto recortado y expone las sugerencias', () => {
		const { facade, buscarEstudiantes } = crearFacade();
		facade.buscarEstudiantes('  pérez ');

		expect(buscarEstudiantes).toHaveBeenCalledWith('pérez');
		expect(facade.sugerencias()).toEqual([ana]);
	});

	it('cambiar de alumno descarta el reparto y el pago registrado anteriores', () => {
		const { facade } = crearFacade();
		facade.iniciar({ id: 280, nombre: 'Pérez, Ana' });
		facade.reparto.set([
			{ cargoId: 1, estudianteId: 280, estudiante: 'Ana', concepto: 'Pensión', montoBase: 10, montoRecargo: 0 },
		] as never);
		facade.pagoRegistrado.set(9);

		facade.iniciar({ id: 77, nombre: 'Otro' });

		expect(facade.reparto()).toEqual([]);
		expect(facade.pagoRegistrado()).toBeNull();
		expect(facade.estudiante()?.id).toBe(77);
	});
});
