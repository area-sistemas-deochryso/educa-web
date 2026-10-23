// * Tests for the delivery state attached to each grading row (INV-C18).
import { describe, expect, it } from 'vitest';
import type {
	CalificacionConNotasDto,
	EntregaCalificacionDto,
	GrupoContenidoDto,
} from '@features/intranet/pages/profesor/models';
import { buildGrupoNotaRows, buildNotaRows } from './calificar-dialog.helpers';

const entrega = (over: Partial<EntregaCalificacionDto>): EntregaCalificacionDto => ({
	estudianteId: 1,
	estudianteNombre: 'Alumno',
	estudianteDni: '00000000',
	estado: 'ENTREGADO',
	fechaEntrega: '2026-10-02T09:00:00',
	grupoId: null,
	grupoNombre: null,
	archivos: [],
	...over,
});

const conTarea = (over: Partial<CalificacionConNotasDto>): CalificacionConNotasDto =>
	({ id: 10, esGrupal: false, tareaId: 7, notas: [], entregas: [], ...over }) as CalificacionConNotasDto;

const grupo = (id: number, estudiantes: number[]): GrupoContenidoDto =>
	({
		id,
		nombre: `Grupo ${id}`,
		estudiantes: estudiantes.map((e) => ({ estudianteId: e, estudianteNombre: `E${e}` })),
	}) as GrupoContenidoDto;

describe('entrega de la tarea enlazada en las filas de calificar', () => {
	it('asigna a cada alumno su propia entrega', () => {
		const cal = conTarea({
			entregas: [entrega({ estudianteId: 1, estado: 'ENTREGADO' }), entrega({ estudianteId: 2, estado: 'TARDIO' })],
		});

		const rows = buildNotaRows(cal, [
			{ id: 1, nombre: 'Ana' },
			{ id: 2, nombre: 'Luis' },
		]);

		expect(rows.map((r) => r.entrega?.estado)).toEqual(['ENTREGADO', 'TARDIO']);
	});

	it('deja la entrega en null si el alumno no tiene fila en entregas', () => {
		const cal = conTarea({ entregas: [entrega({ estudianteId: 1 })] });

		const [, sinFila] = buildNotaRows(cal, [
			{ id: 1, nombre: 'Ana' },
			{ id: 9, nombre: 'Nuevo' },
		]);

		expect(sinFila.entrega).toBeNull();
	});

	it('no muestra entrega si la evaluación no tiene tarea, aunque el BE mande filas', () => {
		const cal = conTarea({ tareaId: null, entregas: [entrega({ estudianteId: 1 })] });

		const [row] = buildNotaRows(cal, [{ id: 1, nombre: 'Ana' }]);

		expect(row.entrega).toBeNull();
	});

	it('tolera un BE anterior sin el campo entregas', () => {
		const cal = conTarea({ entregas: undefined });

		const [row] = buildNotaRows(cal, [{ id: 1, nombre: 'Ana' }]);

		expect(row.entrega).toBeNull();
	});

	it('en evaluación grupal toma la entrega del grupo, con los archivos de sus miembros', () => {
		const archivo = {
			id: 1,
			estudianteId: 2,
			nombreArchivo: 'tp.pdf',
			urlArchivo: 'https://x/tp.pdf',
			tipoArchivo: null,
			tamanoBytes: null,
			fechaReg: '2026-10-02T09:00:00',
		};
		const cal = conTarea({
			esGrupal: true,
			entregas: [
				entrega({ estudianteId: 1, grupoId: 5, archivos: [archivo] }),
				entrega({ estudianteId: 2, grupoId: 5, archivos: [archivo] }),
				entrega({ estudianteId: 3, grupoId: 6, estado: 'PENDIENTE', fechaEntrega: null }),
			],
		});

		const [g5, g6] = buildGrupoNotaRows(cal, [grupo(5, [1, 2]), grupo(6, [3])]);

		expect(g5.entrega?.archivos).toHaveLength(1);
		expect(g6.entrega?.estado).toBe('PENDIENTE');
	});

	it('un grupo sin fila de entrega queda en null', () => {
		const cal = conTarea({ esGrupal: true, entregas: [] });

		const [g] = buildGrupoNotaRows(cal, [grupo(5, [1])]);

		expect(g.entrega).toBeNull();
	});
});
