import { describe, expect, it } from 'vitest';

import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { groupHorariosByPair } from './curso-hub-pair.helpers';

// #region Fixtures
function slot(
	id: number,
	diaSemana: number,
	cursoId: number,
	salonId: number,
	extra: Partial<HorarioProfesorDto> = {},
) {
	return {
		id,
		diaSemana,
		horaInicio: '08:00',
		horaFin: '09:00',
		cursoId,
		salonId,
		cursoNombre: `Curso ${cursoId}`,
		salonDescripcion: `Salón ${salonId}`,
		profesorNombreCompleto: null,
		cantidadEstudiantes: 20,
		...extra,
	} as HorarioProfesorDto;
}
// #endregion

describe('groupHorariosByPair', () => {
	it('returns no groups without schedules', () => {
		expect(groupHorariosByPair([])).toEqual([]);
	});

	it('groups the slots of the same (curso, salón) pair and orders them by week position', () => {
		const wed = slot(2, 3, 24, 34);
		const mon = slot(1, 1, 24, 34);

		const [group] = groupHorariosByPair([wed, mon]);

		expect(group.key).toBe('24-34');
		expect(group.slots).toEqual([mon, wed]);
	});

	it('keeps the same course in different classrooms as separate pairs', () => {
		const groups = groupHorariosByPair([slot(1, 1, 24, 34), slot(2, 1, 24, 35)]);

		expect(groups.map((g) => g.key)).toEqual(['24-34', '24-35']);
	});

	it('orders pairs by first appearance', () => {
		const groups = groupHorariosByPair([slot(1, 1, 30, 1), slot(2, 2, 10, 1), slot(3, 3, 30, 1)]);

		expect(groups.map((g) => g.cursoId)).toEqual([30, 10]);
		expect(groups[0].slots.map((s) => s.id)).toEqual([1, 3]);
	});

	it('takes the pair labels and student count from the schedules', () => {
		const [group] = groupHorariosByPair([slot(1, 1, 24, 34, { cantidadEstudiantes: 31 })]);

		expect(group).toMatchObject({
			cursoNombre: 'Curso 24',
			salonDescripcion: 'Salón 34',
			cantidadEstudiantes: 31,
		});
	});

	it('lists each teacher once and skips slots without teacher', () => {
		const [group] = groupHorariosByPair([
			slot(1, 1, 24, 34, { profesorNombreCompleto: 'Ana Ruiz' }),
			slot(2, 2, 24, 34, { profesorNombreCompleto: null }),
			slot(3, 3, 24, 34, { profesorNombreCompleto: 'Ana Ruiz' }),
			slot(4, 4, 24, 34, { profesorNombreCompleto: 'Luis Paz' }),
		]);

		expect(group.profesores).toEqual(['Ana Ruiz', 'Luis Paz']);
	});
});
