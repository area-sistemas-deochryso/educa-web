import { describe, expect, it } from 'vitest';

import type { SalonAdminListDto } from '@data/models';
import { TODOS_LOS_SALONES, alternarNuevo, idsInscripcion, opcionesSalon, resumenNuevos } from './alumnos-salon.logic';

const salon = (id: number, grado: string, gradoOrden: number, seccion: string, sede = 'Central'): SalonAdminListDto =>
	({ id, grado, gradoOrden, seccion, sede }) as SalonAdminListDto;

describe('opcionesSalon', () => {
	it('pone «Todos los salones» primero y ordena por grado y sección', () => {
		const opciones = opcionesSalon([salon(3, '2° Primaria', 2, 'A'), salon(2, '1° Primaria', 1, 'B'), salon(1, '1° Primaria', 1, 'A')]);

		expect(opciones[0]).toBe(TODOS_LOS_SALONES);
		expect(opciones.slice(1).map((o) => o.salonId)).toEqual([1, 2, 3]);
		expect(opciones[1].nombre).toBe('1° Primaria A');
	});

	it('nombra la sede solo cuando hay más de una', () => {
		const una = opcionesSalon([salon(1, '1° Primaria', 1, 'A')]);
		const varias = opcionesSalon([salon(1, '1° Primaria', 1, 'A', 'Central'), salon(2, '1° Primaria', 1, 'B', 'Norte')]);

		expect(una[1].nombre).toBe('1° Primaria A');
		expect(varias[1].nombre).toBe('1° Primaria A · Central');
	});

	it('sin salones deja solo «Todos»', () => {
		expect(opcionesSalon([])).toEqual([TODOS_LOS_SALONES]);
	});
});

describe('alternarNuevo', () => {
	it('marca sin duplicar y desmarca', () => {
		expect(alternarNuevo([1], 2, true)).toEqual([1, 2]);
		expect(alternarNuevo([1, 2], 2, true)).toEqual([1, 2]);
		expect(alternarNuevo([1, 2], 1, false)).toEqual([2]);
	});
});

describe('idsInscripcion', () => {
	it('une los de la búsqueda y los del salón sin repetir', () => {
		expect(idsInscripcion([1, 2], [2, 3])).toEqual([1, 2, 3]);
		expect(idsInscripcion([], [])).toEqual([]);
	});
});

describe('resumenNuevos', () => {
	it('describe salón vacío, sin nuevos y con nuevos, con el singular correcto', () => {
		expect(resumenNuevos(0, 0)).toBe('El salón no tiene alumnos.');
		expect(resumenNuevos(1, 0)).toBe('1 alumno, ninguno marcado como nuevo.');
		expect(resumenNuevos(30, 1)).toBe('30 alumnos, 1 marcado como nuevo.');
		expect(resumenNuevos(30, 4)).toBe('30 alumnos, 4 marcados como nuevos.');
	});
});
