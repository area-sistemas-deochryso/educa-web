import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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

describe('RegistrarPagoFacade — reintento tras un error de idempotencia', () => {
	const datos = {
		monto: 10,
		fechaPago: '2026-11-09',
		horaPago: null,
		medio: 'EFECTIVO' as const,
		bancoOrigen: null,
		numeroOperacion: null,
		comprobante: 'S/N',
		observaciones: null,
	};

	function crearConRegistro(errores: unknown[]) {
		const respuestas = [...errores];
		const registrarPago = vi.fn(() => {
			const err = respuestas.shift();
			return err ? throwError(() => err) : of({ id: 5 });
		});
		TestBed.configureTestingModule({
			providers: [
				RegistrarPagoFacade,
				{ provide: PagosApiService, useValue: { registrarPago, familia: () => of([]) } },
			],
		});
		const facade = TestBed.inject(RegistrarPagoFacade);
		facade.reparto.set([
			{ cargoId: 1, estudianteId: 280, estudiante: 'Ana', concepto: 'Pensión', cuota: null, vencimiento: null, montoBase: 10, montoRecargo: 0 },
		]);
		return { facade, registrarPago };
	}

	const claveDe = (fn: ReturnType<typeof vi.fn>, llamada: number): unknown => (fn.mock.calls[llamada] as unknown[])[1];

	it('409 IDEMPOTENCIA_EN_CURSO conserva la clave y ofrece verificar la cuenta', () => {
		const { facade, registrarPago } = crearConRegistro([{ status: 409, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } }]);

		facade.registrar(datos);
		expect(facade.pagoEnCurso()).toBe(true);

		facade.registrar(datos);
		expect(claveDe(registrarPago, 1)).toBe(claveDe(registrarPago, 0));
		expect(facade.pagoEnCurso()).toBe(false);
		expect(facade.pagoRegistrado()).toBe(5);
	});

	it('409 por cargo en competencia descarta la clave', () => {
		const { facade, registrarPago } = crearConRegistro([{ status: 409, error: { errorCode: 'PAGO_CARGO_COMPETENCIA' } }]);

		facade.registrar(datos);
		expect(facade.pagoEnCurso()).toBe(false);

		facade.registrar(datos);
		expect(claveDe(registrarPago, 1)).not.toBe(claveDe(registrarPago, 0));
	});

	it('un 400 de negocio descarta la clave y no ofrece verificar', () => {
		const { facade, registrarPago } = crearConRegistro([{ status: 400, error: { errorCode: 'PAGO_MONTO_INVALIDO' } }]);

		facade.registrar(datos);
		facade.registrar(datos);

		expect(claveDe(registrarPago, 1)).not.toBe(claveDe(registrarPago, 0));
	});
});
