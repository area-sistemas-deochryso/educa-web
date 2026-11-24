import { describe, expect, it } from 'vitest';

import type { VistaPreviaGeneracion } from '@data/models';
import {
	armarPayloadAlumno,
	avisoSinCargo,
	cargosTexto,
	debeOfrecerMatricula,
	hayAlgoQueCrear,
	motivoSinCargos,
	resumenOferta,
} from './matricula-oferta.logic';

const vp = (parcial: Partial<VistaPreviaGeneracion>): VistaPreviaGeneracion => ({
	anio: 2027,
	aCrear: 0,
	yaExisten: 0,
	nacenSinDato: 0,
	nacenConfirmados: 0,
	porConcepto: [],
	omitidos: [],
	...parcial,
});

describe('armarPayloadAlumno', () => {
	it('lleva año, alumno y la marca de alumno nuevo tal cual', () => {
		expect(armarPayloadAlumno(2027, 15, true)).toEqual({ anio: 2027, estudianteId: 15, esNuevo: true });
		expect(armarPayloadAlumno(2027, 15, false).esNuevo).toBe(false);
	});
});

describe('hayAlgoQueCrear', () => {
	it('solo con cargos por crear en una vista previa calculada', () => {
		expect(hayAlgoQueCrear(null)).toBe(false);
		expect(hayAlgoQueCrear(vp({ aCrear: 0 }))).toBe(false);
		expect(hayAlgoQueCrear(vp({ aCrear: 2 }))).toBe(true);
	});
});

describe('motivoSinCargos', () => {
	it('no hay motivo si hay cargos por crear ni vista previa', () => {
		expect(motivoSinCargos(null)).toBeNull();
		expect(motivoSinCargos(vp({ aCrear: 1 }))).toBeNull();
	});

	it('cita el motivo del BE cuando se omite (sin parámetros, sin monto, sin salón del año)', () => {
		const sinParametros = motivoSinCargos(vp({ omitidos: [{ motivo: 'SIN_PARAMETROS', concepto: null, cantidad: 1 }] }));
		expect(sinParametros).toContain('parámetros');
		expect(motivoSinCargos(vp({ omitidos: [{ motivo: 'SIN_MONTO', concepto: 'MATRICULA', cantidad: 1 }] }))).toContain('Sin monto');
		expect(motivoSinCargos(vp({ omitidos: [{ motivo: 'ALUMNO_NO_MATRICULADO', concepto: null, cantidad: 1 }] }))).toContain('matrícula activa');
	});

	it('repetir la operación no es un problema: dice que ya existe (idempotencia)', () => {
		expect(motivoSinCargos(vp({ yaExisten: 2 }))).toContain('ya tiene sus cargos');
	});

	it('sin cargos, sin omitidos y sin existentes, da un motivo genérico', () => {
		expect(motivoSinCargos(vp({}))).toContain('No hay cargos');
	});
});

describe('textos', () => {
	it('cargosTexto singulariza', () => {
		expect(cargosTexto(1)).toBe('1 cargo');
		expect(cargosTexto(2)).toBe('2 cargos');
	});

	it('resumenOferta cuenta lo que se crea y lo que ya existía', () => {
		expect(resumenOferta(vp({ aCrear: 2 }))).toBe('Se crearán 2 cargos.');
		expect(resumenOferta(vp({ aCrear: 1, yaExisten: 1 }))).toBe('Se creará 1 cargo (1 ya existía).');
		expect(resumenOferta(vp({ aCrear: 1 }))).toBe('Se creará 1 cargo.');
		expect(resumenOferta(vp({ aCrear: 0 }))).toBe('No se crea ningún cargo nuevo.');
	});

	it('avisoSinCargo nombra al alumno y dónde resolverlo', () => {
		const texto = avisoSinCargo('Pérez, Ana');
		expect(texto).toContain('Pérez, Ana');
		expect(texto).toContain('Consistencia');
	});
});

describe('debeOfrecerMatricula', () => {
	it('solo un Estudiante con salón y permiso de pagos', () => {
		expect(debeOfrecerMatricula('Estudiante', 7, true)).toBe(true);
		expect(debeOfrecerMatricula('Estudiante', 7, false)).toBe(false);
		expect(debeOfrecerMatricula('Estudiante', undefined, true)).toBe(false);
		expect(debeOfrecerMatricula('Estudiante', null, true)).toBe(false);
		expect(debeOfrecerMatricula('Profesor', 7, true)).toBe(false);
		expect(debeOfrecerMatricula(undefined, 7, true)).toBe(false);
	});
});
