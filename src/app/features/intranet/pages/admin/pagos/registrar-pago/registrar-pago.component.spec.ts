import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { PagoMedio, RepartoAplicacion } from '@data/models';
import { EduAutoComplete } from '@edu-ui';
import { PagoAdjuntosApiService } from '../services/pago-adjuntos-api.service';
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

const cuentaConMatricula = {
	cargos: [{ cargoId: 10, concepto: 'Matrícula', cuota: null, saldo: 100, datoConfirmado: true, estado: 'Pendiente' }],
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
	medio: WritableSignal<PagoMedio | null>;
	hora: WritableSignal<string | null>;
	banco: WritableSignal<string>;
	operacion: WritableSignal<string>;
	cambiarMedio(medio: PagoMedio): void;
}

function crearComponente(
	registrarPago = vi.fn(() => of({ id: 5 })),
	familia = vi.fn((_id: number) => of([])),
	query: Record<string, string> = {},
	constancia = vi.fn((_id: number) => of({ blob: new Blob(['%PDF']), fileName: 'Constancia_Pago_5.pdf' })),
	adjuntosListar = vi.fn((_id: number) => of([])),
) {
	TestBed.configureTestingModule({
		imports: [RegistrarPagoComponent],
		providers: [
			{
				provide: ActivatedRoute,
				useValue: { queryParamMap: of(convertToParamMap({ estudianteId: '280', nombre: 'Ana Pérez', ...query })) },
			},
			{
				provide: PagosApiService,
				useValue: {
					familia,
					buscarEstudiantes: () => of([]),
					proponerReparto: () => of({ aplicaciones: [aplicacion], sobrante: 0 }),
					estadoCuenta: () => of(cuentaConMatricula),
					registrarPago,
					constancia,
				},
			},
			{ provide: PagoAdjuntosApiService, useValue: { listar: adjuntosListar } },
		],
	});
	const fixture = TestBed.createComponent(RegistrarPagoComponent);
	fixture.detectChanges();
	return { fixture, registrarPago, familia, constancia, adjuntosListar, estado: fixture.componentInstance as unknown as EstadoFormulario };
}

/**
 * Prueba de cableado de la acción principal: propone el reparto, lo registra desde el botón del DOM
 * y comprueba que se envía con una clave de intento.
 */
describe('RegistrarPagoComponent — acción principal', () => {
	it('propone el reparto, registra desde el botón y muestra el id del pago', () => {
		const { fixture, registrarPago, estado } = crearComponente();

		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
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

describe('RegistrarPagoComponent — alumno precargado desde la ruta', () => {
	it('muestra el nombre del alumno en el buscador, no «[object Object]»', async () => {
		const { fixture } = crearComponente();
		await fixture.whenStable();
		fixture.detectChanges();

		const entrada = fixture.nativeElement.querySelector('edu-autocomplete input') as HTMLInputElement;
		expect(entrada.value).toBe('Ana Pérez');
	});
});

describe('RegistrarPagoComponent — por qué no se puede registrar', () => {
	const motivo = (fixture: { nativeElement: HTMLElement }) =>
		fixture.nativeElement.querySelector('[data-testid="motivo-bloqueo"]')?.textContent?.trim();

	it('pide proponer el reparto cuando los datos están completos pero aún no hay reparto', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();

		expect(motivo(fixture)).toBe('Propón el reparto antes de registrar.');
	});

	it('nombra los obligatorios que faltan y no envía nada al hacer clic', () => {
		const { fixture, registrarPago, estado } = crearComponente();
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		expect(motivo(fixture)).toBe('Falta completar: el comprobante.');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(registrarPago).not.toHaveBeenCalled();
	});

	it('no se rompe si se borra la fecha: bloquea el registro y lo dice', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		estado.fecha.set(null);
		fixture.detectChanges();

		expect(motivo(fixture)).toBe('Falta completar: la fecha.');
	});

	it('no hay medio por defecto: el formulario lo pide y no envía nada hasta elegirlo', () => {
		const { fixture, registrarPago, estado } = crearComponente();
		expect(estado.medio()).toBeNull();
		estado.monto.set(100);
		estado.comprobante.set('B001-123');
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		expect(motivo(fixture)).toBe('Falta completar: el medio de pago.');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(registrarPago).not.toHaveBeenCalled();
	});

	it('transferencia sin N.º de operación pide hora y banco; con N.º de operación basta', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.comprobante.set('B001-123');
		estado.cambiarMedio('TRANSFERENCIA');
		fixture.detectChanges();
		expect(motivo(fixture)).toBe('Falta completar: la hora, el banco de origen.');

		estado.operacion.set('0012345');
		fixture.detectChanges();
		expect(motivo(fixture)).toBe('Propón el reparto antes de registrar.');
	});
});

describe('RegistrarPagoComponent — etiquetas de obligatoriedad', () => {
	const etiqueta = (fixture: { nativeElement: HTMLElement }, nombre: string): string => {
		const spans = Array.from(fixture.nativeElement.querySelectorAll('label.campo > span:first-child'));
		const span = spans.find((el) => el.textContent?.trim().startsWith(nombre));
		expect(span, `no existe la etiqueta ${nombre}`).toBeTruthy();
		return (span?.textContent ?? '').replace(/\s+/g, ' ').trim();
	};

	it('en efectivo banco y hora son opcionales', () => {
		const { fixture, estado } = crearComponente();
		estado.cambiarMedio('EFECTIVO');
		fixture.detectChanges();

		expect(etiqueta(fixture, 'Hora')).toBe('Hora (opcional)');
		expect(etiqueta(fixture, 'Banco de origen')).toBe('Banco de origen (opcional)');
		expect(etiqueta(fixture, 'N.º de operación')).toBe('N.º de operación (opcional)');
	});

	it('en transferencia sin N.º de operación banco y hora dejan de decir «opcional»', () => {
		const { fixture, estado } = crearComponente();
		estado.cambiarMedio('TRANSFERENCIA');
		fixture.detectChanges();

		expect(etiqueta(fixture, 'Hora')).toBe('Hora *');
		expect(etiqueta(fixture, 'Banco de origen')).toBe('Banco de origen *');
		expect(etiqueta(fixture, 'N.º de operación')).toBe('N.º de operación (opcional si indicas banco y hora)');
	});

	it('al escribir el N.º de operación banco y hora vuelven a ser opcionales', () => {
		const { fixture, estado } = crearComponente();
		estado.cambiarMedio('YAPE');
		estado.operacion.set('0012345');
		fixture.detectChanges();

		expect(etiqueta(fixture, 'Hora')).toBe('Hora (opcional)');
		expect(etiqueta(fixture, 'Banco de origen')).toBe('Banco de origen (opcional)');
	});
});

describe('RegistrarPagoComponent — cobro rápido de matrícula', () => {
	it('sugiere efectivo y «S/N», pero la persona puede elegir otro medio', () => {
		const { fixture, estado } = crearComponente(undefined, undefined, { concepto: 'MATRICULA' });

		expect(estado.medio()).toBe('EFECTIVO');
		expect(estado.comprobante()).toBe('S/N');

		estado.cambiarMedio('YAPE');
		fixture.detectChanges();
		expect(estado.medio()).toBe('YAPE');
		expect(estado.comprobante()).toBe('');
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
	const TEXTO_MINIMO = 'Un pago parcial debe superar el mínimo';

	it('muestra la regla violada en español, sin código interno, y la limpia al volver a proponer el reparto', () => {
		const { fixture, estado } = crearComponente(vi.fn(rechazo) as never);
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(fixture.nativeElement.textContent).toContain(TEXTO_MINIMO);
		expect(fixture.nativeElement.textContent).not.toMatch(/INV-/);

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		expect(fixture.nativeElement.textContent).not.toContain(TEXTO_MINIMO);
	});

	it('un envío fallido no se descarta a sí mismo: el error sigue visible hasta que algo cambie', () => {
		const { fixture, estado } = crearComponente(vi.fn(rechazo) as never);
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain(TEXTO_MINIMO);
	});

	it('el recuadro rojo se limpia al corregir cualquier campo del pago, no solo el monto', () => {
		const { fixture, estado } = crearComponente(vi.fn(rechazo) as never);
		estado.monto.set(100);
		estado.cambiarMedio('TRANSFERENCIA');
		estado.hora.set('10:30');
		estado.banco.set('BCP');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');
		expect(fixture.nativeElement.textContent).toContain(TEXTO_MINIMO);

		// Corregir el medio a efectivo, como en el hallazgo original: el error anterior ya no aplica.
		estado.cambiarMedio('EFECTIVO');
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).not.toContain(TEXTO_MINIMO);
	});

	it('ante 409 IDEMPOTENCIA_EN_CURSO ofrece abrir el estado de cuenta del alumno y reenvía con la misma clave', () => {
		const enCurso = { status: 409, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } };
		const registrarPago = vi.fn().mockReturnValueOnce(throwError(() => enCurso)).mockReturnValue(of({ id: 5 }));
		const { fixture, estado } = crearComponente(registrarPago as never);
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();

		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');

		const enlace = fixture.nativeElement.querySelector('[data-testid="verificar-estado-cuenta"]') as HTMLAnchorElement | null;
		expect(enlace, 'falta el enlace al estado de cuenta').toBeTruthy();
		expect(enlace?.getAttribute('href')).toBe('/intranet/admin/pagos/estado-cuenta/280');
		expect(enlace?.getAttribute('target')).toBe('_blank');
		expect(fixture.nativeElement.textContent).not.toContain('mismo cargo');

		clic(fixture, 'edu-button[label="Registrar pago"]');
		const claves = registrarPago.mock.calls.map((llamada: unknown[]) => llamada[1]);
		expect(claves).toHaveLength(2);
		expect(claves[1]).toBe(claves[0]);
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

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('@core/helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('@core/helpers')>()),
	downloadBlob,
}));

function registrarUnPago(fixture: { nativeElement: HTMLElement; detectChanges: () => void }, estado: EstadoFormulario): void {
	estado.monto.set(100);
	estado.medio.set('EFECTIVO');
	estado.comprobante.set('B001-123');
	fixture.detectChanges();
	clic(fixture, 'edu-button[label="Proponer reparto"]');
	clic(fixture, 'edu-button[label="Registrar pago"]');
}

describe('RegistrarPagoComponent — voucher tras registrar (P124 F6)', () => {
	it('antes de registrar no ofrece adjuntar ni lee vouchers', () => {
		const { fixture, adjuntosListar } = crearComponente();
		expect(fixture.nativeElement.querySelector('app-pago-adjuntos')).toBeNull();
		expect(adjuntosListar).not.toHaveBeenCalled();
	});

	it('tras registrar muestra el panel del voucher del pago recién creado, sin alterar el registro', () => {
		const { fixture, estado, registrarPago, adjuntosListar } = crearComponente();
		registrarUnPago(fixture, estado);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('app-pago-adjuntos')).not.toBeNull();
		expect(adjuntosListar).toHaveBeenCalledWith(5);
		expect(registrarPago).toHaveBeenCalledTimes(1);
	});
});

describe('RegistrarPagoComponent — constancia tras registrar (P124 F4)', () => {
	it('antes de registrar no ofrece la constancia', () => {
		const { fixture } = crearComponente();
		expect(fixture.nativeElement.querySelector('[data-testid="constancia-pago"]')).toBeNull();
	});

	it('tras registrar permite descargar la constancia del pago recién creado', () => {
		downloadBlob.mockReset();
		const { fixture, estado, constancia } = crearComponente();
		registrarUnPago(fixture, estado);

		clic(fixture, '[data-testid="constancia-pago"]');

		expect(constancia).toHaveBeenCalledWith(5);
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Constancia_Pago_5.pdf');
	});

	it('si falla la descarga muestra el error y el pago sigue registrado', () => {
		downloadBlob.mockReset();
		const { fixture, estado } = crearComponente(
			undefined,
			undefined,
			{},
			vi.fn(() => throwError(() => ({ status: 403 }))),
		);
		registrarUnPago(fixture, estado);

		clic(fixture, '[data-testid="constancia-pago"]');

		expect(fixture.nativeElement.querySelector('[data-testid="error-constancia"]')?.textContent).toContain('No tienes permiso');
		expect(fixture.nativeElement.textContent).toContain('Pago registrado (N.º 5)');
		expect(downloadBlob).not.toHaveBeenCalled();
	});
});

describe('RegistrarPagoComponent — cierre del registro', () => {
	it('tras registrar ofrece ir al estado de cuenta del alumno que pagó', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		estado.medio.set('EFECTIVO');
		estado.comprobante.set('B001-123');
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');
		clic(fixture, 'edu-button[label="Registrar pago"]');

		const enlace = fixture.nativeElement.querySelector('[data-testid="ver-estado-cuenta"]') as HTMLAnchorElement | null;
		expect(enlace, 'falta el enlace al estado de cuenta').toBeTruthy();
		expect(enlace?.getAttribute('href')).toBe('/intranet/admin/pagos/estado-cuenta/280');
		expect(enlace?.textContent).toContain('Ana Pérez');
	});

	it('antes de registrar no hay enlace de cierre', () => {
		const { fixture } = crearComponente();
		expect(fixture.nativeElement.querySelector('[data-testid="ver-estado-cuenta"]')).toBeNull();
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

	it('junta alumno, concepto y vencimiento en una sola columna «Cargo» (3 columnas en total)', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		const cabeceras = Array.from(fixture.nativeElement.querySelectorAll('.tabla--reparto thead th')).map((th) =>
			(th as HTMLElement).textContent?.trim(),
		);
		expect(cabeceras).toEqual(['Cargo', 'Base (S/)', 'Recargo (S/)']);

		const celda = fixture.nativeElement.querySelector('.tabla--reparto td.cargo') as HTMLElement;
		expect(celda.textContent).toContain('Ana Pérez');
		expect(celda.textContent).toContain('Pensión · cuota Marzo');
		expect(celda.textContent).toContain('Vence');
	});

	it('cada importe editable tiene un nombre accesible que dice de qué cargo es', () => {
		const { fixture, estado } = crearComponente();
		estado.monto.set(100);
		fixture.detectChanges();
		clic(fixture, 'edu-button[label="Proponer reparto"]');

		const nombres = Array.from(fixture.nativeElement.querySelectorAll('.tabla--reparto input.importe')).map((input) =>
			(input as HTMLElement).getAttribute('aria-label'),
		);
		expect(nombres).toEqual(['Base de Pensión de Ana Pérez', 'Recargo de Pensión de Ana Pérez']);
	});
});
