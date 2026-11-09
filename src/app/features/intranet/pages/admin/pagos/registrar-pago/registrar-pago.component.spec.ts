import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { RepartoAplicacion } from '@data/models';
import { EduAutoComplete } from '@edu-ui';
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

interface EstadoFormulario {
	monto: WritableSignal<number | null>;
	comprobante: WritableSignal<string>;
	fecha: WritableSignal<Date | null>;
}

function crearComponente(registrarPago = vi.fn(() => of({ id: 5 })), familia = vi.fn((_id: number) => of([]))) {
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
					familia,
					buscarEstudiantes: () => of([]),
					proponerReparto: () => of({ aplicaciones: [aplicacion], sobrante: 0 }),
					registrarPago,
				},
			},
		],
	});
	const fixture = TestBed.createComponent(RegistrarPagoComponent);
	fixture.detectChanges();
	return { fixture, registrarPago, familia, estado: fixture.componentInstance as unknown as EstadoFormulario };
}

/**
 * Prueba de cableado de la acción principal: propone el reparto, lo registra desde el botón del DOM
 * y comprueba que se envía con una clave de intento.
 */
describe('RegistrarPagoComponent — acción principal', () => {
	it('propone el reparto, registra desde el botón y muestra el id del pago', () => {
		const { fixture, registrarPago, estado } = crearComponente();

		estado.monto.set(100);
		estado.comprobante.set('B001-123');
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

describe('RegistrarPagoComponent — por qué no se puede registrar', () => {
	const motivo = (fixture: { nativeElement: HTMLElement }) =>
		fixture.nativeElement.querySelector('[data-testid="motivo-bloqueo"]')?.textContent?.trim();

	it('pide proponer el reparto cuando los datos están completos pero aún no hay reparto', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.comprobante.set('B001-123');
		fixture.detectChanges();

		expect(motivo(fixture)).toBe('Proponé el reparto antes de registrar.');
	});

	it('nombra los obligatorios que faltan y no envía nada al hacer clic', () => {
		const { fixture, registrarPago, estado } = crearComponente();
		estado.monto.set(100);
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		expect(motivo(fixture)).toBe('Falta completar: el comprobante.');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(registrarPago).not.toHaveBeenCalled();
	});

	it('no se rompe si se borra la fecha: bloquea el registro y lo dice', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.comprobante.set('B001-123');
		estado.fecha.set(null);
		fixture.detectChanges();

		expect(motivo(fixture)).toBe('Falta completar: la fecha.');
	});
});

describe('RegistrarPagoComponent — monto', () => {
	const teclear = (fixture: { nativeElement: HTMLElement }, key: string) => {
		const campo = fixture.nativeElement.querySelector('edu-input-number input') as HTMLInputElement;
		const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		campo.dispatchEvent(evento);
		return evento.defaultPrevented;
	};

	it('descarta las letras antes de que lleguen al campo y deja pasar los dígitos', () => {
		const { fixture } = crearComponente();

		expect(teclear(fixture, 'a')).toBe(true);
		expect(teclear(fixture, '7')).toBe(false);
	});
});

describe('RegistrarPagoComponent — rechazo del servidor', () => {
	const rechazo = () => throwError(() => ({ status: 400, error: { errorCode: 'PAGO_MINIMO_NO_ALCANZADO' } }));

	it('muestra la regla violada en español y la limpia al volver a proponer el reparto', () => {
		const { fixture, estado } = crearComponente(vi.fn(rechazo) as never);
		estado.monto.set(100);
		estado.comprobante.set('B001-123');
		fixture.detectChanges();

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(fixture.nativeElement.textContent).toContain('El monto no alcanza el mínimo que exige la regla de pago.');

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		expect(fixture.nativeElement.textContent).not.toContain('El monto no alcanza el mínimo');
	});
});

describe('RegistrarPagoComponent — buscador de alumnos', () => {
	it('al elegir un alumno del buscador carga su grupo familiar', () => {
		const { fixture, familia } = crearComponente();
		expect(familia).toHaveBeenCalledWith(280);

		const buscador = fixture.debugElement.query(By.directive(EduAutoComplete));
		buscador.triggerEventHandler('onSelect', {
			value: { estudianteId: 77, nombreCompleto: 'Díaz, Luis', salon: null },
		});
		fixture.detectChanges();

		expect(familia).toHaveBeenLastCalledWith(77);
		expect(fixture.nativeElement.textContent).toContain('Alumno que paga: Díaz, Luis');
	});
});

describe('RegistrarPagoComponent — reparto', () => {
	it('muestra el vencimiento como fecha legible, no como ISO', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		const texto = fixture.nativeElement.textContent as string;
		expect(texto).toContain('31/03/2026');
		expect(texto).not.toContain('2026-03-31');
	});
});
