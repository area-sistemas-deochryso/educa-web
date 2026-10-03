import { describe, expect, it } from 'vitest';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import {
	buildCursoHubSalonSummary,
	buildSalonesPageTarget,
	isSameCursoHubSalonSummary,
} from './curso-hub-salon.helpers';

const horario = (over: Partial<HorarioProfesorDto>): HorarioProfesorDto =>
	({
		id: 1,
		salonId: 34,
		salonDescripcion: '5to A',
		cursoId: 24,
		cursoNombre: 'Matemática',
		cantidadEstudiantes: 28,
		...over,
	}) as HorarioProfesorDto;

describe('buildCursoHubSalonSummary', () => {
	it('returns null when the user has no schedule in that salón', () => {
		expect(buildCursoHubSalonSummary([horario({ salonId: 99 })], 34)).toBeNull();
	});

	it('takes the salón data and lists each course once, sorted by name', () => {
		const summary = buildCursoHubSalonSummary(
			[
				horario({ id: 1, cursoId: 30, cursoNombre: 'Historia' }),
				horario({ id: 2, cursoId: 24, cursoNombre: 'Álgebra' }),
				horario({ id: 3, cursoId: 30, cursoNombre: 'Historia' }),
				horario({ id: 4, salonId: 99, cursoId: 50, cursoNombre: 'Otro salón' }),
			],
			34,
		);

		expect(summary).toEqual({
			salonId: 34,
			salonDescripcion: '5to A',
			cantidadEstudiantes: 28,
			cursos: [
				{ cursoId: 24, nombre: 'Álgebra' },
				{ cursoId: 30, nombre: 'Historia' },
			],
		});
	});
});

describe('isSameCursoHubSalonSummary', () => {
	const base = buildCursoHubSalonSummary([horario({})], 34);

	it('treats two summaries built from different slots of the same salón as equal', () => {
		const other = buildCursoHubSalonSummary([horario({ id: 2, diaSemana: 3 } as Partial<HorarioProfesorDto>)], 34);

		expect(isSameCursoHubSalonSummary(base, other)).toBe(true);
	});

	it('detects a change in the student count or the courses', () => {
		expect(isSameCursoHubSalonSummary(base, buildCursoHubSalonSummary([horario({ cantidadEstudiantes: 30 })], 34))).toBe(false);
		expect(
			isSameCursoHubSalonSummary(
				base,
				buildCursoHubSalonSummary([horario({}), horario({ id: 2, cursoId: 31, cursoNombre: 'Arte' })], 34),
			),
		).toBe(false);
	});

	it('handles null on either side', () => {
		expect(isSameCursoHubSalonSummary(null, null)).toBe(true);
		expect(isSameCursoHubSalonSummary(base, null)).toBe(false);
	});
});

describe('buildSalonesPageTarget', () => {
	it('points to the salones page of the role with the slot as query', () => {
		expect(buildSalonesPageTarget('estudiante', 7)).toEqual({
			commands: ['/intranet', 'estudiante', 'salones'],
			queryParams: { horarioId: 7 },
		});
	});
});
