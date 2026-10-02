import { describe, expect, it } from 'vitest';

import { buildCursoHubLink, buildCursosListCommands } from './curso-hub-link.helpers';

describe('buildCursoHubLink', () => {
	const horario = { id: 77, cursoId: 24, salonId: 34 };

	it('builds the profesor hub path with the slot as query', () => {
		expect(buildCursoHubLink('profesor', horario)).toEqual({
			commands: ['/intranet', 'profesor', 'cursos', 24, 34],
			queryParams: { horarioId: 77 },
		});
	});

	it('builds the estudiante hub path with the slot as query', () => {
		expect(buildCursoHubLink('estudiante', horario)).toEqual({
			commands: ['/intranet', 'estudiante', 'cursos', 24, 34],
			queryParams: { horarioId: 77 },
		});
	});

	it('omits the slot query when linking to the pair only', () => {
		expect(buildCursoHubLink('profesor', horario, { withSlot: false }).queryParams).toEqual({});
	});
});

describe('buildCursosListCommands', () => {
	it('points to the role Cursos list', () => {
		expect(buildCursosListCommands('profesor')).toEqual(['/intranet', 'profesor', 'cursos']);
		expect(buildCursosListCommands('estudiante')).toEqual(['/intranet', 'estudiante', 'cursos']);
	});
});
