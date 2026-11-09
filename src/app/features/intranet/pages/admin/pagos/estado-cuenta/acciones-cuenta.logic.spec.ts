import { describe, expect, it } from 'vitest';

import {
	admiteAjuste,
	ajusteValido,
	armarPayloadAjuste,
	avisoAnularPago,
	mensajeDeError,
	requiereRecarga,
	topeAjuste,
} from './acciones-cuenta.logic';

const conCodigo = (errorCode: string, status = 400) => ({ status, error: { errorCode } });

describe('acciones-cuenta.logic', () => {
	describe('mensajeDeError', () => {
		it.each([
			['PAGO_NO_ENCONTRADO', 'anular-pago', 'ya no existe'],
			['PAGO_YA_ANULADO', 'anular-pago', 'ya estaba anulado'],
			['PAGO_MOTIVO_ANULACION_REQUERIDO', 'anular-pago', 'motivo de la anulación'],
			['PAGO_MOTIVO_ANULACION_REQUERIDO', 'anular-ajuste', 'motivo de la anulación'],
			['AJUSTE_TIPO_INVALIDO', 'registrar-ajuste', 'tipo de ajuste'],
			['AJUSTE_MONTO_INVALIDO', 'registrar-ajuste', 'mayor que cero'],
			['AJUSTE_MOTIVO_REQUERIDO', 'registrar-ajuste', 'descuento requiere un motivo'],
			['AJUSTE_EXCEDE_SALDO', 'registrar-ajuste', 'no puede superar'],
			['AJUSTE_NO_ENCONTRADO', 'anular-ajuste', 'ya no existe'],
			['AJUSTE_YA_ANULADO', 'anular-ajuste', 'ya estaba anulado'],
			['PAGO_CARGO_NO_APLICABLE', 'registrar-ajuste', 'sin dato'],
		] as const)('%s en %s se explica en español', (codigo, accion, fragmento) => {
			expect(mensajeDeError(conCodigo(codigo), accion)).toContain(fragmento);
		});

		it('nunca muestra el texto crudo del servidor ni un código desconocido', () => {
			const err = { status: 400, error: { errorCode: 'CODIGO_NUEVO', message: 'INV-PG08: texto del BE' } };
			const msg = mensajeDeError(err, 'registrar-ajuste');
			expect(msg).not.toContain('INV-PG08');
			expect(msg).not.toContain('CODIGO_NUEVO');
		});

		it('un 409 es competencia (CONCURRENCY_CONFLICT), no un código de pagos', () => {
			expect(mensajeDeError(conCodigo('CONCURRENCY_CONFLICT', 409), 'anular-pago')).toContain('al mismo tiempo');
		});

		it('sin respuesta, registrar un ajuste avisa del riesgo de duplicarlo', () => {
			expect(mensajeDeError({ status: 0 }, 'registrar-ajuste')).toContain('dos veces');
			expect(mensajeDeError({ status: 0 }, 'anular-pago')).toContain('anulado');
		});
	});

	describe('requiereRecarga', () => {
		it('recarga cuando la cuenta mostrada ya no es la real', () => {
			expect(requiereRecarga({ status: 0 })).toBe(true);
			expect(requiereRecarga({ status: 404 })).toBe(true);
			expect(requiereRecarga(conCodigo('CONCURRENCY_CONFLICT', 409))).toBe(true);
			expect(requiereRecarga(conCodigo('PAGO_YA_ANULADO'))).toBe(true);
			expect(requiereRecarga(conCodigo('AJUSTE_YA_ANULADO'))).toBe(true);
			expect(requiereRecarga(conCodigo('AJUSTE_NO_ENCONTRADO', 404))).toBe(true);
		});

		it('no recarga ante un rechazo de validación: el diálogo conserva lo escrito', () => {
			expect(requiereRecarga(conCodigo('AJUSTE_EXCEDE_SALDO'))).toBe(false);
			expect(requiereRecarga(conCodigo('AJUSTE_MOTIVO_REQUERIDO'))).toBe(false);
			expect(requiereRecarga({ status: 500 })).toBe(false);
		});
	});

	describe('admiteAjuste', () => {
		it('un cargo sin dato (INV-PG14) y uno pagado no ofrecen ajuste', () => {
			expect(admiteAjuste({ estado: 'SinDato' })).toBe(false);
			expect(admiteAjuste({ estado: 'Pagado' })).toBe(false);
		});

		it.each(['Vencida', 'EnPlazo', 'Pendiente'] as const)('un cargo %s sí lo ofrece', (estado) => {
			expect(admiteAjuste({ estado })).toBe(true);
		});
	});

	describe('topeAjuste', () => {
		it('es montoBase − ajuste − pagadoBase, sin errores de punto flotante', () => {
			expect(topeAjuste({ montoBase: 0.3, ajuste: 0.1, pagadoBase: 0.1 })).toBe(0.1);
			expect(topeAjuste({ montoBase: 500, ajuste: 50, pagadoBase: 100 })).toBe(350);
		});

		it('nunca es negativo', () => {
			expect(topeAjuste({ montoBase: 100, ajuste: 100, pagadoBase: 50 })).toBe(0);
		});
	});

	describe('pago de familia', () => {
		it('avisa solo cuando el pago cubrió más que lo de este alumno', () => {
			expect(avisoAnularPago({ monto: 800, montoAplicadoAlumno: 800 })).toBeNull();
			const aviso = avisoAnularPago({ monto: 800, montoAplicadoAlumno: 300 });
			expect(aviso).toMatch(/S\/\s800\.00/);
			expect(aviso).toMatch(/S\/\s300\.00/);
			expect(aviso).toContain('otros alumnos');
		});
	});

	describe('ajuste', () => {
		it('el motivo es obligatorio solo en descuentos (INV-PG08)', () => {
			expect(ajusteValido({ tipo: 'DESCUENTO', monto: 10, motivo: '  ' })).toBe(false);
			expect(ajusteValido({ tipo: 'DESCUENTO', monto: 10, motivo: 'Hermano' })).toBe(true);
			expect(ajusteValido({ tipo: 'ESPECIE', monto: 10, motivo: '' })).toBe(true);
		});

		it('exige monto mayor que cero', () => {
			expect(ajusteValido({ tipo: 'ESPECIE', monto: 0, motivo: '' })).toBe(false);
			expect(ajusteValido({ tipo: 'ESPECIE', monto: 0.004, motivo: '' })).toBe(false);
		});

		it('arma el payload con motivo recortado o null', () => {
			expect(armarPayloadAjuste({ cargoId: 7, tipo: 'DESCUENTO', monto: 25.5, motivo: ' Hermano ' })).toEqual({
				cargoId: 7,
				tipo: 'DESCUENTO',
				monto: 25.5,
				motivo: 'Hermano',
			});
			expect(armarPayloadAjuste({ cargoId: 7, tipo: 'ESPECIE', monto: 10, motivo: ' ' }).motivo).toBeNull();
		});
	});
});
