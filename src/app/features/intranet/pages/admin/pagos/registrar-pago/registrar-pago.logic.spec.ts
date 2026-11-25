import { describe, expect, it } from 'vitest';

import type { RegistrarPagoPayload, RepartoAplicacion } from '@data/models';
import {
	armarPayload,
	camposFaltantes,
	claveParaEnvio,
	comprobanteSugerido,
	conceptoDeRuta,
	mensajeCargoNoAplicable,
	mensajeSinConfirmar,
	precargarCobro,
	repartoCoincideConPrecarga,
	esIdempotenciaEnCurso,
	resultadoDesconocido,
	diferenciaCentavos,
	huellaDe,
	mensajeDeError,
	repartoCuadra,
	requisitosPago,
	teclaPermitidaEnMonto,
	toCentavos,
	totalCentavos,
} from './registrar-pago.logic';
import type { DatosParaValidar } from './registrar-pago.logic';

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

	it('409 IDEMPOTENCIA_EN_CURSO manda a verificar el estado de cuenta, no a hablar de competencia', () => {
		const msg = mensajeDeError({ status: 409, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } });
		expect(msg).toContain('estado de cuenta');
		expect(msg).not.toContain('mismo cargo');
	});

	it('un 409 con otro errorCode sigue siendo competencia por el cargo', () => {
		expect(mensajeDeError({ status: 409, error: { errorCode: 'OTRO' } })).toContain('mismo cargo');
	});
});

describe('registrar-pago.logic — resultado desconocido', () => {
	it('solo 409 con IDEMPOTENCIA_EN_CURSO cuenta como en curso', () => {
		expect(esIdempotenciaEnCurso({ status: 409, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } })).toBe(true);
		expect(esIdempotenciaEnCurso({ status: 409 })).toBe(false);
		expect(esIdempotenciaEnCurso({ status: 400, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } })).toBe(false);
		expect(esIdempotenciaEnCurso(null)).toBe(false);
	});

	it('el resultado es desconocido sin respuesta o en curso, y en ningún otro caso', () => {
		expect(resultadoDesconocido({ status: 0 })).toBe(true);
		expect(resultadoDesconocido({ status: 409, error: { errorCode: 'IDEMPOTENCIA_EN_CURSO' } })).toBe(true);
		expect(resultadoDesconocido({ status: 409 })).toBe(false);
		expect(resultadoDesconocido({ status: 400, error: { errorCode: 'PAGO_MONTO_INVALIDO' } })).toBe(false);
		expect(resultadoDesconocido({ status: 500 })).toBe(false);
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

describe('requisitosPago (INV-PG03)', () => {
	it('en efectivo no se exige banco ni hora, haya o no N.º de operación', () => {
		expect(requisitosPago('EFECTIVO', '')).toEqual({ banco: false, hora: false });
		expect(requisitosPago('EFECTIVO', '123')).toEqual({ banco: false, hora: false });
	});

	it.each(['TRANSFERENCIA', 'DEPOSITO', 'YAPE', 'PLIN', 'OTRO'] as const)(
		'%s sin N.º de operación exige banco y hora; con N.º de operación no',
		(medio) => {
			expect(requisitosPago(medio, '')).toEqual({ banco: true, hora: true });
			expect(requisitosPago(medio, '   ')).toEqual({ banco: true, hora: true });
			expect(requisitosPago(medio, '0012345')).toEqual({ banco: false, hora: false });
		},
	);

	it('sin medio elegido no exige nada (ya falta «el medio de pago»)', () => {
		expect(requisitosPago(null, '')).toEqual({ banco: false, hora: false });
	});
});

describe('camposFaltantes', () => {
	const completo: DatosParaValidar = {
		monto: 100,
		comprobante: 'B001-123',
		fechaValida: true,
		medio: 'EFECTIVO',
		hora: null,
		banco: '',
		numeroOperacion: '',
	};

	it('no reporta nada cuando todo lo obligatorio está completo (efectivo no pide banco ni hora)', () => {
		expect(camposFaltantes(completo)).toEqual([]);
	});

	it('reporta el monto en cero, el que se redondea a cero y el vacío', () => {
		expect(camposFaltantes({ ...completo, monto: 0 })).toEqual(['el monto']);
		expect(camposFaltantes({ ...completo, monto: 0.004 })).toEqual(['el monto']);
	});

	it('trata un comprobante solo de espacios como faltante', () => {
		expect(camposFaltantes({ ...completo, comprobante: '   ' })).toEqual(['el comprobante']);
	});

	it('sin medio elegido falta «el medio de pago»', () => {
		expect(camposFaltantes({ ...completo, medio: null })).toEqual(['el medio de pago']);
	});

	it('transferencia sin N.º de operación pide hora y banco; con N.º de operación no', () => {
		const transferencia = { ...completo, medio: 'TRANSFERENCIA' as const };
		expect(camposFaltantes(transferencia)).toEqual(['la hora', 'el banco de origen']);
		expect(camposFaltantes({ ...transferencia, hora: '10:30', banco: 'BCP' })).toEqual([]);
		expect(camposFaltantes({ ...transferencia, numeroOperacion: '0012345' })).toEqual([]);
	});

	it('un banco solo de espacios cuenta como faltante', () => {
		const yape = { ...completo, medio: 'YAPE' as const, hora: '10:30', banco: '   ' };
		expect(camposFaltantes(yape)).toEqual(['el banco de origen']);
	});

	it('reporta varios faltantes en el orden en que aparecen en el formulario', () => {
		expect(
			camposFaltantes({
				monto: 0,
				comprobante: '',
				fechaValida: false,
				medio: 'DEPOSITO',
				hora: null,
				banco: '',
				numeroOperacion: '',
			}),
		).toEqual(['el monto', 'la fecha', 'la hora', 'el banco de origen', 'el comprobante']);
	});
});

describe('registrar-pago.logic — textos de rechazo sin código interno', () => {
	it.each([
		'PAGO_COMPROBANTE_REQUERIDO',
		'PAGO_IDENTIFICACION_INCOMPLETA',
		'PAGO_MINIMO_NO_ALCANZADO',
		'PAGO_PARAMETRO_ANIO_INEXISTENTE',
	])('%s se muestra en lenguaje de caja, sin «INV-»', (errorCode) => {
		const msg = mensajeDeError({ status: 422, error: { errorCode } });
		expect(msg).not.toMatch(/INV-/);
		expect(msg).not.toContain('No se pudo registrar');
	});

	it('el rechazo por pago mínimo dice qué hacer', () => {
		const msg = mensajeDeError({ status: 422, error: { errorCode: 'PAGO_MINIMO_NO_ALCANZADO' } });
		expect(msg).toContain('mínimo');
		expect(msg).toContain('cuota completa');
	});

	it('el texto de administración usa tuteo, no voseo', () => {
		const msg = mensajeDeError({ status: 422, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } });
		expect(msg).toContain('Pídela');
		expect(msg).not.toContain('Pedila');
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

describe('cobro rápido de matrícula', () => {
	const cargo = (over: Partial<{ cargoId: number; concepto: string; cuota: string | null; saldo: number; datoConfirmado: boolean; estado: string }>) => ({
		cargoId: 1,
		concepto: 'Matrícula',
		cuota: null,
		saldo: 350,
		datoConfirmado: true,
		estado: 'Pendiente',
		...over,
	});

	it('conceptoDeRuta acepta matrícula/inscripción sin importar tildes o mayúsculas y descarta lo demás', () => {
		expect(conceptoDeRuta('matrícula')).toBe('MATRICULA');
		expect(conceptoDeRuta('INSCRIPCION')).toBe('INSCRIPCION');
		expect(conceptoDeRuta('pension')).toBeNull();
		expect(conceptoDeRuta(null)).toBeNull();
	});

	it('precargarCobro suma solo los cobrables del concepto pedido', () => {
		const cargos = [
			cargo({ cargoId: 1, saldo: 350 }),
			cargo({ cargoId: 2, concepto: 'Inscripción', saldo: 100 }),
			cargo({ cargoId: 3, concepto: 'Pensión', cuota: '3', saldo: 400 }),
		];
		const solo = precargarCobro(cargos, ['MATRICULA']);
		expect(solo.cobrables.map((c) => c.cargoId)).toEqual([1]);
		expect(solo.monto).toBe(350);
		expect(precargarCobro(cargos, ['MATRICULA', 'INSCRIPCION']).monto).toBe(450);
	});

	it('un cargo pagado no se cobra y uno «sin dato» bloquea con su nombre', () => {
		const pagado = precargarCobro([cargo({ estado: 'Pagado', saldo: 0 })], ['MATRICULA']);
		expect(pagado.cobrables).toEqual([]);
		expect(pagado.sinConfirmar).toEqual([]);

		const sinDato = precargarCobro([cargo({ datoConfirmado: false, estado: 'SinDato', saldo: 0 })], ['MATRICULA']);
		expect(sinDato.cobrables).toEqual([]);
		expect(sinDato.sinConfirmar).toHaveLength(1);
		expect(mensajeSinConfirmar(sinDato.sinConfirmar)).toContain('«Matrícula»');
	});

	it('mensajeCargoNoAplicable nombra el cargo si es uno solo y lista candidatos si son varios', () => {
		expect(mensajeCargoNoAplicable([{ concepto: 'Matrícula', cuota: null }])).toContain('«Matrícula»');
		const varios = mensajeCargoNoAplicable([
			{ concepto: 'Matrícula', cuota: null },
			{ concepto: 'Pensión', cuota: '3' },
		]);
		expect(varios).toContain('Uno de los cargos');
		expect(varios).toContain('«Pensión · cuota 3»');
	});

	it('repartoCoincideConPrecarga exige los mismos cargos y que cuadre', () => {
		const apps = [{ ...app(350), cargoId: 1 }];
		expect(repartoCoincideConPrecarga(apps, [{ cargoId: 1 }], 350)).toBe(true);
		expect(repartoCoincideConPrecarga(apps, [{ cargoId: 2 }], 350)).toBe(false);
		expect(repartoCoincideConPrecarga([...apps, { ...app(50), cargoId: 9 }], [{ cargoId: 1 }], 400)).toBe(false);
		expect(repartoCoincideConPrecarga(apps, [{ cargoId: 1 }], 300)).toBe(false);
	});

	it('comprobanteSugerido pone «S/N» en efectivo y lo retira solo si lo puso el sistema', () => {
		expect(comprobanteSugerido('EFECTIVO', '')).toBe('S/N');
		expect(comprobanteSugerido('EFECTIVO', 'B001-45')).toBe('B001-45');
		expect(comprobanteSugerido('YAPE', 'S/N')).toBe('');
		expect(comprobanteSugerido('YAPE', 'B001-45')).toBe('B001-45');
	});
});
