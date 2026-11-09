import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PagosApiService } from '../services/pagos-api.service';
import { AccionesCuentaFacade } from './acciones-cuenta.facade';

function crear(api: Partial<Record<'anularPago' | 'registrarAjuste' | 'anularAjuste', unknown>>) {
	TestBed.configureTestingModule({
		providers: [AccionesCuentaFacade, { provide: PagosApiService, useValue: api }],
	});
	return TestBed.inject(AccionesCuentaFacade);
}

describe('AccionesCuentaFacade', () => {
	it('anular un pago envía el motivo recortado y pide recargar la cuenta', () => {
		const anularPago = vi.fn(() => of({}));
		const facade = crear({ anularPago });
		const fin = vi.fn();

		facade.anularPago(11, '  Duplicado ', fin);

		expect(anularPago).toHaveBeenCalledWith(11, 'Duplicado');
		expect(fin).toHaveBeenCalledWith({ exito: true, recargar: true });
		expect(facade.guardando()).toBe(false);
		expect(facade.error()).toBeNull();
	});

	it('un rechazo de regla deja el mensaje en español y no recarga', () => {
		const registrarAjuste = vi.fn(() => throwError(() => ({ status: 400, error: { errorCode: 'AJUSTE_EXCEDE_SALDO' } })));
		const facade = crear({ registrarAjuste });
		const fin = vi.fn();

		facade.registrarAjuste({ cargoId: 1, tipo: 'DESCUENTO', monto: 999, motivo: 'x' }, fin);

		expect(facade.error()).toContain('no puede superar');
		expect(fin).toHaveBeenCalledWith({ exito: false, recargar: false });
		expect(facade.guardando()).toBe(false);
	});

	it('PAGO_YA_ANULADO recarga la cuenta porque lo mostrado quedó viejo', () => {
		const anularPago = vi.fn(() => throwError(() => ({ status: 400, error: { errorCode: 'PAGO_YA_ANULADO' } })));
		const facade = crear({ anularPago });
		const fin = vi.fn();

		facade.anularPago(11, 'x', fin);

		expect(fin).toHaveBeenCalledWith({ exito: false, recargar: true });
	});

	it('ignora una segunda acción mientras hay una en curso', () => {
		const anularAjuste = vi.fn(() => NEVER);
		const facade = crear({ anularAjuste });

		facade.anularAjuste(5, 'a', vi.fn());
		facade.anularAjuste(5, 'a', vi.fn());

		expect(anularAjuste).toHaveBeenCalledTimes(1);
		expect(facade.guardando()).toBe(true);
	});
});
