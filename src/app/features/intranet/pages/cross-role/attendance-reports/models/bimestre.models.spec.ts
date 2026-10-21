// * Plan xrepo-116 F2 — helpers puros de bimestres: preselección del vigente y validación local (INV-RE05).
import { describe, expect, it } from 'vitest';

import {
	elegirBimestreDefault,
	isoToCorto,
	isoToLocalDate,
	validarEdicion,
	type BimestreAsistencia,
} from './bimestre.models';

const III: BimestreAsistencia = {
	id: 3, anio: 2026, numero: 3, nombre: 'III Bimestre',
	fechaInicio: '2026-08-10T00:00:00', fechaFin: '2026-10-16T00:00:00', rowVersion: 'AQ==',
};
const IV: BimestreAsistencia = {
	id: 4, anio: 2026, numero: 4, nombre: 'IV Bimestre',
	fechaInicio: '2026-10-19T00:00:00', fechaFin: '2026-12-17T00:00:00', rowVersion: 'AQ==',
};

describe('elegirBimestreDefault', () => {
	it('elige el bimestre que contiene hoy', () => {
		expect(elegirBimestreDefault([III, IV], new Date(2026, 9, 21))?.id).toBe(4);
		expect(elegirBimestreDefault([III, IV], new Date(2026, 8, 1))?.id).toBe(3);
	});

	it('incluye el primer y el último día del rango', () => {
		expect(elegirBimestreDefault([III, IV], new Date(2026, 7, 10))?.id).toBe(3);
		expect(elegirBimestreDefault([III, IV], new Date(2026, 9, 16))?.id).toBe(3);
		expect(elegirBimestreDefault([III, IV], new Date(2026, 11, 17))?.id).toBe(4);
	});

	it('en el hueco entre bimestres (fin de semana 17-18 oct) elige el último que ya empezó', () => {
		expect(elegirBimestreDefault([III, IV], new Date(2026, 9, 17))?.id).toBe(3);
	});

	it('tras la clausura elige el último; antes del primero elige el primero', () => {
		expect(elegirBimestreDefault([III, IV], new Date(2026, 11, 18))?.id).toBe(4);
		expect(elegirBimestreDefault([III, IV], new Date(2026, 0, 5))?.id).toBe(3);
	});

	it('no depende del orden en que llegan', () => {
		expect(elegirBimestreDefault([IV, III], new Date(2026, 8, 1))?.id).toBe(3);
	});

	it('sin bimestres devuelve null', () => {
		expect(elegirBimestreDefault([], new Date())).toBeNull();
	});
});

describe('validarEdicion', () => {
	const d = (m: number, dia: number) => new Date(2026, m - 1, dia);

	it('acepta un rango válido que no se solapa', () => {
		expect(validarEdicion({ fechaInicio: d(8, 10), fechaFin: d(10, 15) }, 2026, [IV])).toBe('');
	});

	it('acepta días adyacentes (fin 16-oct, el otro empieza 19-oct)', () => {
		expect(validarEdicion({ fechaInicio: d(8, 10), fechaFin: d(10, 18) }, 2026, [IV])).toBe('');
	});

	it('rechaza fechas vacías', () => {
		expect(validarEdicion({ fechaInicio: null, fechaFin: d(10, 15) }, 2026, [])).toContain('Indica fecha');
	});

	it('rechaza fin anterior a inicio', () => {
		expect(validarEdicion({ fechaInicio: d(10, 16), fechaFin: d(8, 10) }, 2026, [])).toContain('anterior');
	});

	it('rechaza fechas fuera del año del bimestre', () => {
		expect(validarEdicion({ fechaInicio: d(8, 10), fechaFin: new Date(2027, 0, 5) }, 2026, [])).toContain('2026');
	});

	it('rechaza el solape con otro bimestre guardado y lo nombra', () => {
		const msg = validarEdicion({ fechaInicio: d(8, 10), fechaFin: d(10, 19) }, 2026, [IV]);
		expect(msg).toContain('IV Bimestre');
		expect(msg).toContain('19/10');
	});
});

describe('conversión de fechas ISO del BE', () => {
	it('isoToLocalDate no corre el día por huso horario', () => {
		const fecha = isoToLocalDate('2026-08-10T00:00:00');
		expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate()]).toEqual([2026, 7, 10]);
	});

	it('isoToCorto formatea dd/MM', () => {
		expect(isoToCorto('2026-08-10T00:00:00')).toBe('10/08');
	});
});
