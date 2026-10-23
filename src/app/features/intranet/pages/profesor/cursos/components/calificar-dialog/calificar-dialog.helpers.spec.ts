// * Tests for the pure input helpers shared by the individual and group grading lists.
// #region Imports
import { describe, expect, it } from 'vitest';
import type { ConfiguracionLiteralDto } from '@data/models';
import type {
	CalificacionConNotasDto,
	CalificacionNotaDto,
	GrupoContenidoDto,
	GrupoNotaRow,
} from '@features/intranet/pages/profesor/models';

import {
	buildGrupoNotaRows,
	buildGruposPayload,
	calcGrupoStats,
	clampNota,
	literalMidpoint,
	notasFueraDeGrupo,
	sanitizeObservacion,
} from './calificar-dialog.helpers';

const nota = (over: Partial<CalificacionNotaDto>): CalificacionNotaDto => ({
	id: 1,
	calificacionId: 10,
	estudianteId: 1,
	estudianteNombre: 'Alumno',
	nota: 13,
	observacion: null,
	fechaCalificacion: '2026-10-01T00:00:00',
	esOverride: false,
	grupoId: null,
	grupoNombre: null,
	esEditable: true,
	...over,
});

const calGrupal = (notas: CalificacionNotaDto[]): CalificacionConNotasDto =>
	({ id: 10, esGrupal: true, notas }) as CalificacionConNotasDto;

const grupo = (id: number, estudiantes: number[]): GrupoContenidoDto =>
	({
		id,
		nombre: `Grupo ${id}`,
		estudiantes: estudiantes.map((e) => ({ estudianteId: e, estudianteNombre: `E${e}` })),
	}) as GrupoContenidoDto;

// #endregion

describe('clampNota', () => {
	it('rounds to one decimal', () => {
		expect(clampNota(14.26)).toBe(14.3);
	});

	it('clamps to the 0-20 range', () => {
		expect(clampNota(25)).toBe(20);
		expect(clampNota(-3)).toBe(0);
	});
});

describe('literalMidpoint', () => {
	it('returns null without a literal or without bounds', () => {
		expect(literalMidpoint(null)).toBeNull();
		expect(literalMidpoint({ notaMinima: null, notaMaxima: 20 } as ConfiguracionLiteralDto)).toBeNull();
	});

	it('returns the midpoint rounded to one decimal', () => {
		expect(literalMidpoint({ notaMinima: 11, notaMaxima: 14 } as ConfiguracionLiteralDto)).toBe(12.5);
	});
});

describe('sanitizeObservacion', () => {
	it('strips disallowed characters and keeps accents and punctuation', () => {
		expect(sanitizeObservacion('Muy bien <b>ñandú</b>, sí.')).toBe('Muy bien bñandúb, sí.');
	});

	it('truncates to 100 characters', () => {
		expect(sanitizeObservacion('a'.repeat(150))).toHaveLength(100);
	});
});

describe('grupos tras pasar de individual a grupal (todas las notas son excepción)', () => {
	const cal = calGrupal([
		nota({ id: 1, estudianteId: 1, nota: 13, observacion: 'Buen trabajo', esOverride: true, grupoId: 5 }),
		nota({ id: 2, estudianteId: 2, nota: 15, observacion: null, esOverride: true, grupoId: 5 }),
		nota({ id: 3, estudianteId: 3, nota: 9, observacion: 'Mejorar', esOverride: true, grupoId: 6 }),
	]);
	const grupos = [grupo(5, [1, 2]), grupo(6, [3, 4])];

	it('keeps each member observation and does not copy an exception observation to the group', () => {
		const rows = buildGrupoNotaRows(cal, grupos);
		expect(rows[0].nota).toBeNull();
		expect(rows[0].observacion).toBe('');
		expect(rows[0].miembros.map((m) => m.observacion)).toEqual(['Buen trabajo', '']);
	});

	it('sends a group without its own nota when every member has an exception, keeping observations', () => {
		const rows = buildGrupoNotaRows(cal, [grupos[0]]);
		const { grupos: payload, incompletos } = buildGruposPayload(rows);
		expect(incompletos).toEqual([]);
		expect(payload).toHaveLength(1);
		expect(payload[0].overrides).toEqual([
			{ estudianteId: 1, nota: 13, observacion: 'Buen trabajo' },
			{ estudianteId: 2, nota: 15, observacion: null },
		]);
	});

	it('flags a group whose exceptions do not cover every member instead of dropping it silently', () => {
		const rows = buildGrupoNotaRows(cal, [grupos[1]]);
		const { grupos: payload, incompletos } = buildGruposPayload(rows);
		expect(payload).toEqual([]);
		expect(incompletos).toEqual(['Grupo 6']);
	});

	it('counts students, not groups, and includes saved notas of students outside any group', () => {
		const withStray = calGrupal([...cal.notas, nota({ id: 9, estudianteId: 99, nota: 11 })]);
		const rows = buildGrupoNotaRows(withStray, grupos);
		const stats = calcGrupoStats(rows, null, notasFueraDeGrupo(withStray, rows));
		expect(stats.total).toBe(5);
		expect(stats.conNota).toBe(4);
		expect(stats.sinCalificar).toBe(1);
		expect(stats.totalGrupos).toBe(2);
	});
});

describe('buildGruposPayload con nota de grupo', () => {
	it('applies the group nota to non-exception members and sends exceptions with their observation', () => {
		const rows: GrupoNotaRow[] = [
			{
				grupoId: 5,
				grupoNombre: 'Grupo 5',
				nota: 16,
				observacion: 'Grupo',
				miembros: [
					{ estudianteId: 1, nombre: 'A', notaActual: 16, esOverride: false, overrideNota: null, observacion: 'Grupo' },
					{ estudianteId: 2, nombre: 'B', notaActual: 12, esOverride: true, overrideNota: 12, observacion: 'Propia' },
				],
			},
		];
		const { grupos } = buildGruposPayload(rows);
		expect(grupos[0]).toMatchObject({ grupoId: 5, nota: 16, observacion: 'Grupo' });
		expect(grupos[0].overrides).toEqual([{ estudianteId: 2, nota: 12, observacion: 'Propia' }]);
	});
});
