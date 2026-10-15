import { describe, expect, it } from 'vitest';
import type { CursoContenidoTareaDto } from '@features/intranet/pages/estudiante/models';
import { contarExamenes, fechaLimiteEstado, proximaFechaLimite, tareaEtiqueta } from './contenido-tarea.helpers';

const DIA = 86_400_000;
const tarea = (extra: Partial<CursoContenidoTareaDto>): CursoContenidoTareaDto => ({
	id: 1,
	titulo: 't',
	descripcion: null,
	fechaLimite: null,
	esGrupal: false,
	fechaReg: '2026-10-01',
	archivos: [],
	...extra,
});

describe('contenido-tarea.helpers', () => {
	it('etiqueta cada tipo y modalidad', () => {
		expect(tareaEtiqueta(tarea({}))).toBe('Tarea individual');
		expect(tareaEtiqueta(tarea({ tipo: 'ACTIVIDAD', esGrupal: true }))).toBe('Actividad grupal');
		expect(tareaEtiqueta(tarea({ tipo: 'EXAMEN', esGrupal: true }))).toBe('Examen');
	});

	it('clasifica la urgencia de la fecha límite', () => {
		expect(fechaLimiteEstado(null)).toBe('normal');
		expect(fechaLimiteEstado(new Date(Date.now() - DIA).toISOString())).toBe('vencida');
		expect(fechaLimiteEstado(new Date(Date.now() + DIA).toISOString())).toBe('pronto');
		expect(fechaLimiteEstado(new Date(Date.now() + 9 * DIA).toISOString())).toBe('normal');
	});

	it('elige la próxima fecha no vencida y cuenta exámenes', () => {
		const lejana = new Date(Date.now() + 9 * DIA).toISOString();
		const cercana = new Date(Date.now() + 3 * DIA).toISOString();
		const pasada = new Date(Date.now() - DIA).toISOString();
		const tareas = [tarea({ fechaLimite: lejana }), tarea({ fechaLimite: cercana, tipo: 'EXAMEN' }), tarea({ fechaLimite: pasada })];
		expect(proximaFechaLimite(tareas)).toBe(cercana);
		expect(proximaFechaLimite([])).toBeNull();
		expect(contarExamenes(tareas)).toBe(1);
	});
});
