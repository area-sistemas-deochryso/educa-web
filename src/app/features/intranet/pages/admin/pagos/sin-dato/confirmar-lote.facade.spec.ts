import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ConfirmarSinDatoPayload, FiltroSinDato } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { ConfirmarLoteFacade } from './confirmar-lote.facade';

const filtro: FiltroSinDato = { anio: 2026, salonId: 4, estudianteId: null, concepto: 'PENSION', cuotaDesde: 1, cuotaHasta: 2, cargoIds: null };
const vp = (cargos: number) => ({ cargos, alumnos: 3, porConcepto: [{ concepto: 'PENSION', cargos }] });
const payload = (cargosEsperados: number): ConfirmarSinDatoPayload => ({ filtro, desenlace: 'SALDADO', motivo: null, cargosEsperados });

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({ providers: [ConfirmarLoteFacade, { provide: PagosApiService, useValue: api }] });
	return TestBed.inject(ConfirmarLoteFacade);
}

describe('ConfirmarLoteFacade', () => {
	it('calcula el conteo previo sin confirmar nada', () => {
		const vistaPreviaConfirmacion = vi.fn(() => of(vp(24)));
		const confirmarSinDato = vi.fn();
		const facade = crear({ vistaPreviaConfirmacion, confirmarSinDato });

		facade.calcular(filtro);

		expect(vistaPreviaConfirmacion).toHaveBeenCalledWith(filtro);
		expect(facade.vistaPrevia()?.cargos).toBe(24);
		expect(confirmarSinDato).not.toHaveBeenCalled();
	});

	it('confirma con el conteo de la vista previa y deja el resultado', () => {
		const confirmarSinDato = vi.fn(() => of({ desenlace: 'SALDADO', confirmados: 24, omitidos: 0 }));
		const facade = crear({ confirmarSinDato });

		facade.confirmar(payload(24));

		expect(confirmarSinDato).toHaveBeenCalledWith(payload(24));
		expect(facade.resultado()).toEqual({ desenlace: 'SALDADO', confirmados: 24, omitidos: 0 });
		expect(facade.vistaPrevia()).toBeNull();
	});

	it('un 409 recalcula la vista previa con el número nuevo y avisa; no deja resultado', () => {
		const vistaPreviaConfirmacion = vi.fn(() => of(vp(20)));
		const confirmarSinDato = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'CARGO_CONFIRMACION_VISTA_PREVIA_DESACTUALIZADA' } })),
		);
		const facade = crear({ vistaPreviaConfirmacion, confirmarSinDato });

		facade.confirmar(payload(24));

		expect(vistaPreviaConfirmacion).toHaveBeenCalledWith(filtro);
		expect(facade.vistaPrevia()?.cargos).toBe(20);
		expect(facade.error()).toContain('Los datos cambiaron');
		expect(facade.resultado()).toBeNull();
		expect(facade.confirmando()).toBe(false);
	});

	it('sin respuesta del servidor recalcula: si ya se confirmó, el conteo baja', () => {
		const vistaPreviaConfirmacion = vi.fn(() => of(vp(0)));
		const facade = crear({ vistaPreviaConfirmacion, confirmarSinDato: () => throwError(() => ({ status: 0 })) });

		facade.confirmar(payload(24));

		expect(facade.vistaPrevia()?.cargos).toBe(0);
		expect(facade.error()).toContain('el conteo bajará');
	});

	it('un rechazo de regla deja el mensaje, no recalcula y no reintenta', () => {
		const vistaPreviaConfirmacion = vi.fn();
		const confirmarSinDato = vi.fn(() =>
			throwError(() => ({ status: 400, error: { errorCode: 'CARGO_CONFIRMACION_DESENLACE_INVALIDO' } })),
		);
		const facade = crear({ vistaPreviaConfirmacion, confirmarSinDato });

		facade.confirmar(payload(24));

		expect(confirmarSinDato).toHaveBeenCalledTimes(1);
		expect(vistaPreviaConfirmacion).not.toHaveBeenCalled();
		expect(facade.error()).toContain('Debe');
	});

	it('ignora un segundo clic mientras confirma (evita el doble envío)', () => {
		const confirmarSinDato = vi.fn(() => NEVER);
		const facade = crear({ confirmarSinDato });

		facade.confirmar(payload(24));
		facade.confirmar(payload(24));

		expect(confirmarSinDato).toHaveBeenCalledTimes(1);
		expect(facade.confirmando()).toBe(true);
	});

	it('reiniciar descarta conteo, resultado y error', () => {
		const facade = crear({ vistaPreviaConfirmacion: () => of(vp(24)) });
		facade.calcular(filtro);

		facade.reiniciar();

		expect(facade.vistaPrevia()).toBeNull();
		expect(facade.resultado()).toBeNull();
		expect(facade.error()).toBeNull();
	});
});
