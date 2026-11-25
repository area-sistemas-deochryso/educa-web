import { describe, expect, it } from 'vitest';

import type { MesesPagadosEstado } from '@data/models';
import { ESTADOS_LEYENDA, ESTADO_VISUAL, contarPagadas, etiquetaCelda, tieneSaldo } from './meses-pagados.logic';

const ESTADOS: MesesPagadosEstado[] = ['Pagado', 'Vencida', 'EnPlazo', 'Pendiente', 'SinDato', 'SinCargo', 'NoAplica'];

describe('meses-pagados.logic', () => {
	it('cada uno de los 7 estados se reconoce sin depender del color: tiene texto e icono propios', () => {
		const textos = ESTADOS.map((e) => ESTADO_VISUAL[e].texto);
		const iconos = ESTADOS.map((e) => ESTADO_VISUAL[e].icono);

		expect(new Set(textos).size).toBe(7);
		expect(new Set(iconos).size).toBe(7);
		for (const e of ESTADOS) expect(ESTADO_VISUAL[e].icono).toMatch(/^pi pi-/);
	});

	it('la leyenda lista los 7 estados exactamente una vez', () => {
		expect([...ESTADOS_LEYENDA].sort()).toEqual([...ESTADOS].sort());
	});

	it('«Sin dato» tiene su propia clase: no se pinta como deuda ni como pagado (INV-PG14)', () => {
		const clase = ESTADO_VISUAL.SinDato.clase;

		expect(clase).not.toBe(ESTADO_VISUAL.Vencida.clase);
		expect(clase).not.toBe(ESTADO_VISUAL.Pagado.clase);
	});

	it('el saldo solo se muestra en Vencida, EnPlazo y Pendiente y cuando es mayor a cero', () => {
		expect(tieneSaldo({ estado: 'Vencida', saldo: 50 })).toBe(true);
		expect(tieneSaldo({ estado: 'EnPlazo', saldo: 50 })).toBe(true);
		expect(tieneSaldo({ estado: 'Pendiente', saldo: 50 })).toBe(true);
		expect(tieneSaldo({ estado: 'Vencida', saldo: 0 })).toBe(false);
		expect(tieneSaldo({ estado: 'Pagado', saldo: 50 })).toBe(false);
		expect(tieneSaldo({ estado: 'SinDato', saldo: 50 })).toBe(false);
	});

	it('la etiqueta accesible incluye columna, estado y saldo si lo hay', () => {
		expect(etiquetaCelda('Marzo', { estado: 'Pagado', saldo: 0 })).toBe('Marzo: Pagado');
		expect(etiquetaCelda('Abril', { estado: 'Vencida', saldo: 120 })).toMatch(/^Abril: Vencida, falta .*120/);
	});

	it('contarPagadas cuenta solo «Pagado»', () => {
		expect(
			contarPagadas([
				{ estado: 'Pagado', saldo: 0 },
				{ estado: 'Vencida', saldo: 10 },
				{ estado: 'SinDato', saldo: 0 },
				{ estado: 'Pagado', saldo: 0 },
			]),
		).toBe(2);
	});
});
