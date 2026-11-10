import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { GenerarCargosPayload, VistaPreviaGeneracion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { GenerarCargosFacade } from './generar-cargos.facade';

const payload: GenerarCargosPayload = { anio: 2026, conceptos: ['MATRICULA', 'PENSION'], salonId: null, inscripcionEstudianteIds: null };

const vistaPrevia = (aCrear: number): VistaPreviaGeneracion => ({
	anio: 2026,
	aCrear,
	yaExisten: 0,
	nacenSinDato: aCrear,
	nacenConfirmados: 0,
	porConcepto: [],
	omitidos: [],
});

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({ providers: [GenerarCargosFacade, { provide: PagosApiService, useValue: api }] });
	return TestBed.inject(GenerarCargosFacade);
}

describe('GenerarCargosFacade', () => {
	it('calcula la vista previa sin generar nada', () => {
		const vistaPreviaGeneracion = vi.fn(() => of(vistaPrevia(30)));
		const generarCargos = vi.fn();
		const facade = crear({ vistaPreviaGeneracion, generarCargos });

		facade.calcular(payload);

		expect(vistaPreviaGeneracion).toHaveBeenCalledWith(payload);
		expect(facade.vistaPrevia()?.aCrear).toBe(30);
		expect(generarCargos).not.toHaveBeenCalled();
	});

	it('genera con crearEsperados igual al conteo de la vista previa y deja el resultado', () => {
		const generarCargos = vi.fn(() => of({ anio: 2026, creados: 30, yaExisten: 0 }));
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(30)), generarCargos });
		facade.calcular(payload);

		facade.generar();

		expect(generarCargos).toHaveBeenCalledWith(payload, 30);
		expect(facade.resultado()).toEqual({ anio: 2026, creados: 30, yaExisten: 0 });
		expect(facade.vistaPrevia()).toBeNull();
		expect(facade.generando()).toBe(false);
	});

	it('sin cargos a crear no ofrece ni ejecuta la generación', () => {
		const generarCargos = vi.fn();
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(0)), generarCargos });
		facade.calcular(payload);

		facade.generar();

		expect(generarCargos).not.toHaveBeenCalled();
	});

	it('sin vista previa no genera (no se confirma un conteo que nadie vio)', () => {
		const generarCargos = vi.fn();
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(5)), generarCargos });

		facade.generar();

		expect(generarCargos).not.toHaveBeenCalled();
	});

	it('un 409 de vista previa desactualizada recalcula y deja el aviso, sin resultado', () => {
		const vistaPreviaGeneracion = vi.fn().mockReturnValueOnce(of(vistaPrevia(30))).mockReturnValueOnce(of(vistaPrevia(28)));
		const generarCargos = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'CARGO_GENERACION_VISTA_PREVIA_DESACTUALIZADA' } })),
		);
		const facade = crear({ vistaPreviaGeneracion, generarCargos });
		facade.calcular(payload);

		facade.generar();

		expect(vistaPreviaGeneracion).toHaveBeenCalledTimes(2);
		expect(facade.vistaPrevia()?.aCrear).toBe(28);
		expect(facade.error()).toContain('Los datos cambiaron');
		expect(facade.resultado()).toBeNull();
		expect(facade.generando()).toBe(false);
	});

	it('sin respuesta del servidor también recalcula: si se creó, aparecerá como «ya existen»', () => {
		const vistaPreviaGeneracion = vi.fn().mockReturnValueOnce(of(vistaPrevia(30))).mockReturnValueOnce(of(vistaPrevia(0)));
		const facade = crear({ vistaPreviaGeneracion, generarCargos: () => throwError(() => ({ status: 0 })) });
		facade.calcular(payload);

		facade.generar();

		expect(facade.vistaPrevia()?.aCrear).toBe(0);
		expect(facade.error()).toContain('ya existen');
	});

	it('un rechazo de regla deja el mensaje y conserva la vista previa, sin reintentar', () => {
		const generarCargos = vi.fn(() => throwError(() => ({ status: 400, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })));
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(30)), generarCargos });
		facade.calcular(payload);

		facade.generar();

		expect(generarCargos).toHaveBeenCalledTimes(1);
		expect(facade.error()).toContain('todavía no tiene parámetros');
		expect(facade.vistaPrevia()?.aCrear).toBe(30);
	});

	it('ignora un segundo clic mientras genera (evita el doble envío)', () => {
		const generarCargos = vi.fn(() => NEVER);
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(30)), generarCargos });
		facade.calcular(payload);

		facade.generar();
		facade.generar();

		expect(generarCargos).toHaveBeenCalledTimes(1);
		expect(facade.generando()).toBe(true);
	});

	it('invalidar descarta el conteo y el resultado anteriores', () => {
		const facade = crear({ vistaPreviaGeneracion: () => of(vistaPrevia(30)) });
		facade.calcular(payload);

		facade.invalidar();

		expect(facade.vistaPrevia()).toBeNull();
		expect(facade.resultado()).toBeNull();
	});

	it('la búsqueda de alumnos exige 2 caracteres', () => {
		const buscarEstudiantes = vi.fn(() => of([]));
		const facade = crear({ buscarEstudiantes });

		facade.buscarEstudiantes(' a ');
		expect(buscarEstudiantes).not.toHaveBeenCalled();

		facade.buscarEstudiantes('ana');
		expect(buscarEstudiantes).toHaveBeenCalledWith('ana');
	});
});
