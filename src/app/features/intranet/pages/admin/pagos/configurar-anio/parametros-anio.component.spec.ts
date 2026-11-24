import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TimeoutError, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ParametroAnio } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { ParametrosAnioComponent } from './parametros-anio.component';
import { ParametrosAnioFacade } from './parametros-anio.facade';

const guardados = (rowVersion = 'v1'): ParametroAnio => ({
	anio: 2026,
	pagoMinimoPartes: 20,
	montoRecargo: 5,
	fechaInicial: '2026-03-01T00:00:00',
	rowVersion,
});

const sinFila = () =>
	throwError(() => ({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } }));

/** Los campos del formulario son `protected`: el spec los escribe como lo haría la plantilla. */
interface Formulario {
	pagoMinimoPartes: WritableSignal<number | null>;
	montoRecargo: WritableSignal<number | null>;
	fechaInicial: WritableSignal<Date | null>;
}

function crear(api: Record<string, unknown>, anio = 2026) {
	TestBed.configureTestingModule({
		imports: [ParametrosAnioComponent],
		providers: [ParametrosAnioFacade, { provide: PagosApiService, useValue: api }],
	});
	const fixture = TestBed.createComponent(ParametrosAnioComponent);
	fixture.componentRef.setInput('anio', anio);
	fixture.detectChanges();
	const componente = fixture.componentInstance;
	return {
		fixture,
		componente,
		form: componente as unknown as Formulario,
		elemento: fixture.nativeElement as HTMLElement,
	};
}

const SELECTOR_GUARDAR = 'edu-button[label="Guardar parámetros"]';

function botonGuardar(elemento: HTMLElement): HTMLButtonElement | null {
	return elemento.querySelector(`${SELECTOR_GUARDAR} button`);
}

function clic(elemento: HTMLElement, selector: string): void {
	const objetivo = elemento.querySelector<HTMLElement>(selector);
	expect(objetivo, `no existe ${selector}`).toBeTruthy();
	objetivo?.click();
}

describe('ParametrosAnioComponent — cambios sin guardar', () => {
	it('después de cargar no hay cambios y «Guardar parámetros» queda deshabilitado', () => {
		const { componente, elemento } = crear({ parametrosAnio: () => of(guardados()) });

		expect(componente.hayCambios()).toBe(false);
		expect(botonGuardar(elemento)?.disabled).toBe(true);
	});

	it('editar marca cambios; volver al valor guardado los quita', () => {
		const { fixture, componente, form, elemento } = crear({
			parametrosAnio: () => of(guardados()),
		});

		form.pagoMinimoPartes.set(25);
		fixture.detectChanges();
		expect(componente.hayCambios()).toBe(true);
		expect(botonGuardar(elemento)?.disabled).toBe(false);

		form.pagoMinimoPartes.set(20);
		fixture.detectChanges();
		expect(componente.hayCambios()).toBe(false);
		expect(botonGuardar(elemento)?.disabled).toBe(true);
	});

	it('elegir de nuevo la misma fecha inicial no cuenta como cambio', () => {
		const { componente, form } = crear({ parametrosAnio: () => of(guardados()) });

		form.fechaInicial.set(new Date(2026, 2, 1));

		expect(componente.hayCambios()).toBe(false);
	});

	it('en un año sin fila (404), completar un valor cuenta como cambio', () => {
		const { componente, form } = crear({ parametrosAnio: sinFila });
		expect(componente.hayCambios()).toBe(false);

		form.montoRecargo.set(5);

		expect(componente.hayCambios()).toBe(true);
	});

	it('pasar de un año sin fila a otro sin fila (404 → 404) vacía lo escrito', () => {
		const parametrosAnio = vi.fn(sinFila);
		const { fixture, componente, form } = crear({ parametrosAnio });
		form.pagoMinimoPartes.set(25);
		expect(componente.hayCambios()).toBe(true);

		fixture.componentRef.setInput('anio', 2027);
		fixture.detectChanges();

		expect(parametrosAnio).toHaveBeenLastCalledWith(2027);
		expect(form.pagoMinimoPartes()).toBeNull();
		expect(componente.hayCambios()).toBe(false);
	});
});

describe('ParametrosAnioComponent — guardar', () => {
	it('guarda lo editado, muestra «Parámetros guardados.» y lo oculta al volver a editar', () => {
		const guardarParametrosAnio = vi.fn(() => of({ ...guardados('v2'), pagoMinimoPartes: 25 }));
		const { fixture, componente, form, elemento } = crear({
			parametrosAnio: () => of(guardados()),
			guardarParametrosAnio,
		});
		form.pagoMinimoPartes.set(25);
		fixture.detectChanges();

		clic(elemento, SELECTOR_GUARDAR);
		fixture.detectChanges();

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(guardarParametrosAnio).toHaveBeenCalledWith({
			anio: 2026,
			pagoMinimoPartes: 25,
			montoRecargo: 5,
			fechaInicial: '2026-03-01',
			rowVersion: 'v1',
		});
		expect(elemento.textContent).toContain('Parámetros guardados.');
		expect(componente.hayCambios()).toBe(false);

		form.montoRecargo.set(6);
		fixture.detectChanges();
		expect(elemento.textContent).not.toContain('Parámetros guardados.');
	});

	it('sin cambios, un clic en «Guardar parámetros» no llama al servidor', () => {
		const guardarParametrosAnio = vi.fn();
		const { fixture, elemento } = crear({
			parametrosAnio: () => of(guardados()),
			guardarParametrosAnio,
		});

		clic(elemento, SELECTOR_GUARDAR);
		fixture.detectChanges();

		expect(guardarParametrosAnio).not.toHaveBeenCalled();
	});
});

describe('ParametrosAnioComponent — guardado incierto: sin respuesta, timeout o 5xx (INV-S05)', () => {
	/** Escribe 7 en el pago mínimo y guarda: el PUT falla con `error` y la relectura trae `releido`. */
	function guardarSieteCon(error: unknown, releido: ParametroAnio) {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(of(guardados()))
			.mockReturnValueOnce(of(releido));
		const guardarParametrosAnio = vi.fn(() => throwError(() => error));
		const pantalla = crear({ parametrosAnio, guardarParametrosAnio });
		pantalla.form.pagoMinimoPartes.set(7);
		pantalla.fixture.detectChanges();

		clic(pantalla.elemento, SELECTOR_GUARDAR);
		pantalla.fixture.detectChanges();

		expect(guardarParametrosAnio).toHaveBeenCalledTimes(1);
		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		return pantalla;
	}

	it('un 503 y el mismo rowVersion al releer: lo escrito sigue y se puede volver a guardar', () => {
		const { componente, form, elemento } = guardarSieteCon({ status: 503 }, guardados('v1'));

		expect(form.pagoMinimoPartes()).toBe(7);
		expect(componente.hayCambios()).toBe(true);
		expect(botonGuardar(elemento)?.disabled).toBe(false);
		expect(elemento.textContent).toContain('No se pudieron guardar los parámetros.');
		expect(elemento.textContent).not.toContain('Parámetros guardados.');
	});

	it('un timeout y el mismo rowVersion: lo escrito sigue y dice que no quedaron guardados', () => {
		const { componente, form, elemento } = guardarSieteCon(new TimeoutError(), guardados('v1'));

		expect(form.pagoMinimoPartes()).toBe(7);
		expect(componente.hayCambios()).toBe(true);
		expect(botonGuardar(elemento)?.disabled).toBe(false);
		expect(elemento.textContent).toContain(
			'No hubo respuesta del servidor y los parámetros no quedaron guardados: tus cambios siguen en pantalla.',
		);
	});

	it.each([
		['un 500', { status: 500 }],
		['un timeout', new TimeoutError()],
	])('%s y otro rowVersion con los valores enviados: el PUT se aplicó y muestra «Parámetros guardados.»', (_caso, error) => {
		const { componente, form, elemento } = guardarSieteCon(error, {
			...guardados('v2'),
			pagoMinimoPartes: 7,
		});

		expect(form.pagoMinimoPartes()).toBe(7);
		expect(componente.hayCambios()).toBe(false);
		expect(elemento.textContent).toContain('Parámetros guardados.');
		expect(elemento.textContent).not.toContain('No se pudieron guardar');
		expect(elemento.textContent).not.toContain('No hubo respuesta');
	});

	it('un 5xx y otro rowVersion con otros valores: adopta los del servidor y avisa que otra persona los cambió', () => {
		const { componente, form, elemento } = guardarSieteCon({ status: 502 }, {
			...guardados('v2'),
			pagoMinimoPartes: 30,
		});

		expect(form.pagoMinimoPartes()).toBe(30);
		expect(componente.hayCambios()).toBe(false);
		expect(elemento.textContent).toContain(
			'Otra persona modificó los parámetros al mismo tiempo. Se recargaron: revísalos y vuelve a guardar.',
		);
		expect(elemento.textContent).not.toContain('Parámetros guardados.');
	});
});

describe('ParametrosAnioComponent — lectura y presentación', () => {
	it('si la lectura falla muestra el error y «Volver a cargar», que lee de nuevo y deja el foco en el título', async () => {
		const parametrosAnio = vi
			.fn()
			.mockReturnValueOnce(throwError(() => ({ status: 500 })))
			.mockReturnValueOnce(of(guardados()));
		const { fixture, componente, elemento } = crear({ parametrosAnio });

		expect(elemento.textContent).toContain('No se pudieron cargar los parámetros del año.');
		expect(elemento.querySelector('edu-input-number')).toBeNull();
		expect(componente.hayCambios()).toBe(false);

		clic(elemento, '[data-testid="recargar-parametros"]');
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		expect(parametrosAnio).toHaveBeenCalledTimes(2);
		expect(elemento.querySelectorAll('edu-input-number')).toHaveLength(2);
		// El botón desapareció con el foco puesto: el foco no cae al inicio de la página (WCAG 2.4.3).
		expect(document.activeElement?.id).toBe('parametros-title');
	});

	it('el título se puede enfocar desde la guía y la fecha se muestra con el año completo', async () => {
		const { fixture, elemento } = crear({ parametrosAnio: () => of(guardados()) });
		await fixture.whenStable();
		fixture.detectChanges();

		const titulo = elemento.querySelector('#parametros-title');
		expect(titulo?.getAttribute('tabindex')).toBe('-1');
		expect(titulo?.textContent).toContain('1. Parámetros del año 2026');
		const fecha = elemento.querySelector<HTMLInputElement>(
			'edu-datepicker .edu-datepicker__input',
		);
		expect(fecha?.value).toBe('01/03/2026');
	});
});
