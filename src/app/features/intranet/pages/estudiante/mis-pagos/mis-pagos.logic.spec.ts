import { describe, expect, it } from 'vitest';

import type { MiCargo, MisPagos } from '@data/models';
import {
	TEXTO_EN_REVISION,
	errorVista,
	esEnRevision,
	estaVacio,
	etiquetaEstado,
	etiquetaVigencia,
	formatFecha,
	formatHora,
	medioDe,
	textoEnRevision,
	tituloCargo,
} from './mis-pagos.logic';

const cuentaVacia = (parcial: Partial<MisPagos> = {}): MisPagos => ({
	fecha: '2026-11-26T00:00:00',
	estudiante: 'Ana Pérez',
	salon: '1A',
	tieneCargosEnRevision: false,
	deudaVencida: 0,
	pendienteTotal: 0,
	cargos: [],
	pagos: [],
	...parcial,
});

const cargo = (parcial: Partial<MiCargo> = {}): MiCargo => ({
	concepto: 'Pensión',
	cuota: 'Marzo',
	anio: 2026,
	estado: 'Pendiente',
	mensaje: null,
	detalle: { vencimiento: '2026-03-31T00:00:00', montoAPagar: 300, pagado: 0, recargo: 0, saldo: 300 },
	...parcial,
});

describe('mis-pagos.logic', () => {
	describe('formatos', () => {
		it('lee la fecha como fecha civil, sin correrla un día por la zona horaria', () => {
			expect(formatFecha('2026-03-01T00:00:00')).toBe('01/03/2026');
			expect(formatFecha('2026-12-31')).toBe('31/12/2026');
		});

		it('recorta la hora a HH:mm y tolera la ausencia', () => {
			expect(formatHora('14:35:10')).toBe('14:35');
			expect(formatHora(null)).toBeNull();
		});
	});

	describe('etiquetas', () => {
		it('un cargo en revisión usa el texto del colegio y no la palabra «sin dato»', () => {
			const enRevision = cargo({ estado: 'EnRevision', detalle: null, mensaje: TEXTO_EN_REVISION });
			expect(etiquetaEstado(enRevision).label).toBe('En revisión');
			expect(textoEnRevision(enRevision)).toBe('En revisión por el colegio');
			expect(etiquetaEstado(enRevision).label.toLowerCase()).not.toContain('sin dato');
		});

		it('si el servidor no manda mensaje, el texto de respaldo es el del colegio', () => {
			expect(textoEnRevision({ mensaje: null })).toBe(TEXTO_EN_REVISION);
			expect(textoEnRevision({ mensaje: '   ' })).toBe(TEXTO_EN_REVISION);
		});

		it('esEnRevision no muestra importes cuando falta el detalle, aunque el estado diga otra cosa', () => {
			expect(esEnRevision(cargo({ estado: 'EnRevision', detalle: null }))).toBe(true);
			expect(esEnRevision(cargo({ estado: 'Pendiente', detalle: null }))).toBe(true);
			expect(esEnRevision(cargo())).toBe(false);
		});

		it('el pago anulado se marca y el vigente no', () => {
			expect(etiquetaVigencia({ vigente: false }).label).toBe('Anulado');
			expect(etiquetaVigencia({ vigente: true }).label).toBe('Registrado');
		});

		it('traduce el medio de pago y deja pasar uno desconocido', () => {
			expect(medioDe('YAPE')).toBe('Yape');
			expect(medioDe('CHEQUE')).toBe('CHEQUE');
		});

		it('arma el título con la cuota o solo con el año', () => {
			expect(tituloCargo({ concepto: 'Pensión', cuota: 'Marzo', anio: 2026 })).toBe('Pensión · Marzo 2026');
			expect(tituloCargo({ concepto: 'Matrícula', cuota: null, anio: 2027 })).toBe('Matrícula 2027');
		});
	});

	describe('estaVacio', () => {
		it('es vacío solo sin cuotas y sin pagos', () => {
			expect(estaVacio(cuentaVacia())).toBe(true);
			expect(estaVacio(cuentaVacia({ cargos: [cargo()] }))).toBe(false);
		});
	});

	describe('errorVista', () => {
		it('explica «ver como» sin ofrecer reintentar', () => {
			const e = errorVista({ status: 403, error: { errorCode: 'PAGO_MIS_PAGOS_SIN_VER_COMO' } });
			expect(e.titulo).toContain('Ver como');
			expect(e.reintentable).toBe(false);
		});

		it('un rol que no es Estudiante (403) no puede reintentar', () => {
			const porCodigo = errorVista({ status: 403, error: { errorCode: 'PAGO_MIS_PAGOS_SOLO_ESTUDIANTE' } });
			const porStatus = errorVista({ status: 403 });
			expect(porCodigo.titulo).toBe('Esta pantalla es solo para estudiantes');
			expect(porStatus.reintentable).toBe(false);
		});

		it('sesión vencida (401) pide volver a ingresar', () => {
			const e = errorVista({ status: 401 });
			expect(e.titulo).toBe('Tu sesión venció');
			expect(e.reintentable).toBe(false);
		});

		it('sin conexión (status 0) permite reintentar', () => {
			const e = errorVista({ status: 0 });
			expect(e.titulo).toBe('Sin conexión');
			expect(e.reintentable).toBe(true);
		});

		it('un error desconocido da un mensaje genérico y nunca el texto crudo del servidor', () => {
			const e = errorVista({ status: 500, error: { errorCode: 'ALGO_RARO' } });
			expect(e.titulo).toBe('No pudimos cargar tus pagos');
			expect(e.reintentable).toBe(true);
			expect(errorVista(null).titulo).toBe('No pudimos cargar tus pagos');
		});
	});
});
