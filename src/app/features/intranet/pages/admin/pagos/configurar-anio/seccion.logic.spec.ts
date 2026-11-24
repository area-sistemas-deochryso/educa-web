import { describe, expect, it } from 'vitest';

import type { ParametroAnio } from '@data/models';

import type { DatosParametros } from '../utils/carga-inicial.logic';
import { listaLegible, parametrosCambiaron } from './seccion.logic';

describe('seccion.logic · listas', () => {
	it('une en español: «A», «A y B», «A, B y C»', () => {
		expect(listaLegible([])).toBe('');
		expect(listaLegible(['a'])).toBe('a');
		expect(listaLegible(['a', 'b'])).toBe('a y b');
		expect(listaLegible(['a', 'b', 'c'])).toBe('a, b y c');
	});
});

describe('seccion.logic · parámetros del año', () => {
	const vacio: DatosParametros = {
		anio: 2027,
		pagoMinimoPartes: null,
		montoRecargo: null,
		fechaInicial: null,
	};
	const guardado: ParametroAnio = {
		anio: 2026,
		pagoMinimoPartes: 20,
		montoRecargo: 5,
		fechaInicial: '2026-09-01T00:00:00',
		rowVersion: 'AAAB',
	};
	const igual: DatosParametros = {
		anio: 2026,
		pagoMinimoPartes: 20,
		montoRecargo: 5,
		fechaInicial: new Date(2026, 8, 1),
	};

	it('sin fila guardada (404) solo cuenta lo escrito', () => {
		expect(parametrosCambiaron(vacio, null)).toBe(false);
		expect(parametrosCambiaron({ ...vacio, pagoMinimoPartes: 20 }, null)).toBe(true);
		expect(parametrosCambiaron({ ...vacio, montoRecargo: 0 }, null)).toBe(true);
		expect(parametrosCambiaron({ ...vacio, fechaInicial: new Date(2027, 2, 1) }, null)).toBe(
			true,
		);
	});

	it('compara los montos en céntimos: 20 contra 20.00 guardado no cambia y 21 sí', () => {
		expect(parametrosCambiaron(igual, { ...guardado, pagoMinimoPartes: 20.0 })).toBe(false);
		expect(
			parametrosCambiaron(
				{ ...igual, pagoMinimoPartes: 0.1 + 0.2 },
				{ ...guardado, pagoMinimoPartes: 0.3 },
			),
		).toBe(false);
		expect(parametrosCambiaron({ ...igual, pagoMinimoPartes: 21 }, guardado)).toBe(true);
		expect(parametrosCambiaron({ ...igual, montoRecargo: 5.5 }, guardado)).toBe(true);
		expect(parametrosCambiaron({ ...igual, montoRecargo: null }, guardado)).toBe(true);
	});

	it('compara la fecha como fecha civil: «2026-09-01T00:00:00» guardada es el 1/9 elegido', () => {
		expect(parametrosCambiaron(igual, guardado)).toBe(false);
		expect(
			parametrosCambiaron({ ...igual, fechaInicial: new Date(2026, 8, 2) }, guardado),
		).toBe(true);
		expect(parametrosCambiaron({ ...igual, fechaInicial: null }, guardado)).toBe(true);
	});

	it('una fecha inicial guardada nula o ausente (el BE omite los nulos) equivale a no tenerla', () => {
		const { fechaInicial: _sinFecha, ...sinFechaEnJson } = guardado;
		const ausente = sinFechaEnJson as ParametroAnio;
		expect(
			parametrosCambiaron(
				{ ...igual, fechaInicial: null },
				{ ...guardado, fechaInicial: null },
			),
		).toBe(false);
		expect(parametrosCambiaron({ ...igual, fechaInicial: null }, ausente)).toBe(false);
		expect(parametrosCambiaron(igual, ausente)).toBe(true);
	});
});
