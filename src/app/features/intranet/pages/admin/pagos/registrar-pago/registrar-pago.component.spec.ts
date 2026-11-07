import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { RepartoAplicacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { RegistrarPagoComponent } from './registrar-pago.component';

const aplicacion: RepartoAplicacion = {
	cargoId: 10,
	estudianteId: 280,
	estudiante: 'Ana Pérez',
	concepto: 'Pensión',
	cuota: 'Marzo',
	vencimiento: '2026-03-31',
	montoBase: 100,
	montoRecargo: 0,
};

function clic(fixture: { nativeElement: HTMLElement; detectChanges: () => void }, selector: string): void {
	const elemento = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
	expect(elemento, `no existe ${selector}`).toBeTruthy();
	elemento?.click();
	fixture.detectChanges();
}

/**
 * Prueba de cableado de la acción principal: propone el reparto, lo registra desde el botón del DOM
 * y comprueba que se envía con una clave de intento.
 */
describe('RegistrarPagoComponent — acción principal', () => {
	it('propone el reparto, registra desde el botón y muestra el id del pago', () => {
		const registrarPago = vi.fn(() => of({ id: 5 }));
		TestBed.configureTestingModule({
			imports: [RegistrarPagoComponent],
			providers: [
				{
					provide: ActivatedRoute,
					useValue: { queryParamMap: of(convertToParamMap({ estudianteId: '280', nombre: 'Ana Pérez' })) },
				},
				{
					provide: PagosApiService,
					useValue: {
						familia: () => of([]),
						proponerReparto: () => of({ aplicaciones: [aplicacion], sobrante: 0 }),
						registrarPago,
					},
				},
			],
		});

		const fixture = TestBed.createComponent(RegistrarPagoComponent);
		fixture.detectChanges();

		const estado = fixture.componentInstance as unknown as { monto: WritableSignal<number | null> };
		estado.monto.set(100);
		fixture.detectChanges();

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');

		expect(registrarPago).toHaveBeenCalledTimes(1);
		const [payload, clave] = registrarPago.mock.calls[0] as unknown as [{ monto: number }, string];
		expect(payload.monto).toBe(100);
		expect(clave.length).toBeGreaterThan(0);
		expect(fixture.nativeElement.textContent).toContain('Pago registrado (N.º 5)');
	});
});
