import { describe, expect, it } from 'vitest';

import type { RegistrarPagoPayload, RepartoAplicacion } from '@data/models';
import {
	armarPayload,
	camposFaltantes,
	claveParaEnvio,
	diferenciaCentavos,
	huellaDe,
	mensajeDeError,
	repartoCuadra,
	teclaPermitidaEnMonto,
	toCentavos,
	totalCentavos,
} from './registrar-pago.logic';

const app = (montoBase: number, montoRecargo = 0): RepartoAplicacion => ({
	cargoId: 1,
	estudianteId: 280,
	estudiante: 'Alumno de prueba',
	concepto: 'Pensión',
	cuota: '3',
	vencimiento: '2026-10-05',
	montoBase,
	montoRecargo,
});

describe('registrar-pago.logic — cuadre del reparto', () => {
	it('suma en centavos sin error de punto flotante (0.1 + 0.2)', () => {
		const apps = [app(0.1), app(0.2)];
		expect(totalCentavos(apps)).toBe(30);
		expect(diferenciaCentavos(0.3, apps)).toBe(0);
	});

	it('cuadra cuando base + recargo igualan el monto', () => {
		const apps = [app(100, 5.5), app(50)];
		expect(repartoCuadra(155.5, apps)).toBe(true);
	});

	it('no cuadra si falta o sobra un centavo', () => {
		const apps = [app(100, 5.5)];
		expect(repartoCuadra(105.51, apps)).toBe(false);
		expect(repartoCuadra(105.49, apps)).toBe(false);
	});

	it('no cuadra sin aplicaciones ni con monto cero', () => {
		expect(repartoCuadra(10, [])).toBe(false);
		expect(repartoCuadra(0, [app(0)])).toBe(false);
	});

	it('no cuadra si una aplicación queda en negativo', () => {
		expect(repartoCuadra(100, [app(-10), app(110)])).toBe(false);
	});

	it('redondea montos con decimales a centavos enteros', () => {
		expect(toCentavos(0.29)).toBe(29);
		expect(toCentavos(19.99)).toBe(1999);
	});
});

describe('registrar-pago.logic — payload', () => {
	const base = {
		monto: 155.5,
		fechaPago: '2026-11-02',
		horaPago: null,
		medio: 'TRANSFERENCIA' as const,
		bancoOrigen: '  ',
		numeroOperacion: '00123',
		comprobante: '  OP-00123  ',
		observaciones: '   ',
		aplicaciones: [app(100, 5.5), app(50)],
	};

	it('envía la hora como HH:mm:ss y limpia textos vacíos', () => {
		const payload = armarPayload({ ...base, horaPago: '14:35' });
		expect(payload.horaPago).toBe('14:35:00');
		expect(payload.bancoOrigen).toBeNull();
		expect(payload.observaciones).toBeNull();
		expect(payload.comprobante).toBe('OP-00123');
	});

	it('manda solo cargoId y montos de cada aplicación', () => {
		const payload = armarPayload(base);
		expect(payload.aplicaciones).toEqual([
			{ cargoId: 1, montoBase: 100, montoRecargo: 5.5 },
			{ cargoId: 1, montoBase: 50, montoRecargo: 0 },
		]);
	});
});

describe('registrar-pago.logic — mapeo de errores', () => {
	it('traduce errorCode del contrato a un mensaje que nombra la regla', () => {
		const msg = mensajeDeError({ status: 400, error: { errorCode: 'PAGO_APLICACION_SUMA_INVALIDA' } });
		expect(msg).toContain('igual al monto');
	});

	it('no muestra el texto crudo del BE para un código desconocido', () => {
		const msg = mensajeDeError({ status: 400, error: { errorCode: 'CODIGO_NUEVO' } });
		expect(msg).not.toContain('CODIGO_NUEVO');
		expect(msg).toContain('No se pudo registrar');
	});

	it('409 se trata como competencia por el mismo cargo', () => {
		expect(mensajeDeError({ status: 409 })).toContain('mismo cargo');
	});

	it('status 0 indica falta de respuesta', () => {
		expect(mensajeDeError({ status: 0 })).toContain('No hubo respuesta');
	});
});

describe('registrar-pago.logic — clave de idempotencia por intento', () => {
	const payload: RegistrarPagoPayload = armarPayload(base());
	const huella = huellaDe(payload);
	let n = 0;
	const generar = () => `clave-${++n}`;

	function base() {
		return {
			monto: 10,
			fechaPago: '2026-11-02',
			horaPago: null,
			medio: 'EFECTIVO' as const,
			bancoOrigen: null,
			numeroOperacion: null,
			comprobante: 'S/N',
			observaciones: null,
			aplicaciones: [app(10)],
		};
	}

	it('genera clave nueva en el primer intento', () => {
		const intento = claveParaEnvio(null, huella, false, generar);
		expect(intento.clave).toBe('clave-1');
	});

	it('reusa la clave tras timeout si el payload no cambió', () => {
		const primero = claveParaEnvio(null, huella, false, generar);
		const reenvio = claveParaEnvio(primero, huella, true, generar);
		expect(reenvio.clave).toBe(primero.clave);
	});

	it('genera clave nueva tras una respuesta HTTP, aunque el payload sea el mismo', () => {
		const primero = claveParaEnvio(null, huella, false, generar);
		const siguiente = claveParaEnvio(primero, huella, false, generar);
		expect(siguiente.clave).not.toBe(primero.clave);
	});

	it('genera clave nueva si el payload cambió tras un timeout', () => {
		const primero = claveParaEnvio(null, huella, false, generar);
		const otraHuella = huellaDe({ ...payload, monto: 99 });
		const siguiente = claveParaEnvio(primero, otraHuella, true, generar);
		expect(siguiente.clave).not.toBe(primero.clave);
	});
});

describe('camposFaltantes', () => {
	const completo = { monto: 100, comprobante: 'B001-123', fechaValida: true };

	it('no reporta nada cuando monto, fecha y comprobante están completos', () => {
		expect(camposFaltantes(completo)).toEqual([]);
	});

	it('reporta el monto en cero, el que se redondea a cero y el vacío', () => {
		expect(camposFaltantes({ ...completo, monto: 0 })).toEqual(['el monto']);
		expect(camposFaltantes({ ...completo, monto: 0.004 })).toEqual(['el monto']);
	});

	it('trata un comprobante solo de espacios como faltante', () => {
		expect(camposFaltantes({ ...completo, comprobante: '   ' })).toEqual(['el comprobante']);
	});

	it('reporta varios faltantes en el orden en que aparecen en el formulario', () => {
		expect(camposFaltantes({ monto: 0, comprobante: '', fechaValida: false })).toEqual([
			'el monto',
			'la fecha',
			'el comprobante',
		]);
	});
});

describe('teclaPermitidaEnMonto', () => {
	it('deja pasar dígitos, punto y coma', () => {
		for (const tecla of ['0', '5', '9', '.', ',']) expect(teclaPermitidaEnMonto(tecla, false)).toBe(true);
	});

	it('descarta letras y signos que no forman parte de un monto', () => {
		for (const tecla of ['a', 'e', 'E', '-', '+', ' ', '$']) expect(teclaPermitidaEnMonto(tecla, false)).toBe(false);
	});

	it('deja pasar teclas con nombre y atajos de teclado', () => {
		for (const tecla of ['Backspace', 'Tab', 'ArrowLeft', 'Enter']) expect(teclaPermitidaEnMonto(tecla, false)).toBe(true);
		expect(teclaPermitidaEnMonto('v', true)).toBe(true);
	});
});
