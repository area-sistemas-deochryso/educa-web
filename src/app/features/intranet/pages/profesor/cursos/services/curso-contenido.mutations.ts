import {
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
	TareaArchivoDto,
} from '../../models';

type Mutator = (contenido: CursoContenidoDetalleDto) => CursoContenidoDetalleDto;

function mapSemana(
	contenido: CursoContenidoDetalleDto,
	semanaId: number,
	updater: (s: CursoContenidoSemanaDto) => CursoContenidoSemanaDto,
): CursoContenidoDetalleDto {
	return {
		...contenido,
		semanas: contenido.semanas.map((sem) => (sem.id === semanaId ? updater(sem) : sem)),
	};
}

function mapTareaEnSemana(
	contenido: CursoContenidoDetalleDto,
	semanaId: number,
	tareaId: number,
	updater: (t: CursoContenidoTareaDto) => CursoContenidoTareaDto,
): CursoContenidoDetalleDto {
	return mapSemana(contenido, semanaId, (sem) => ({
		...sem,
		tareas: sem.tareas.map((t) => (t.id === tareaId ? updater(t) : t)),
	}));
}

export const contenidoMutations = {
	updateSemana: (semanaId: number, updates: Partial<CursoContenidoSemanaDto>): Mutator =>
		(c) => mapSemana(c, semanaId, (sem) => ({ ...sem, ...updates })),

	addArchivoToSemana: (semanaId: number, archivo: CursoContenidoArchivoDto): Mutator =>
		(c) => mapSemana(c, semanaId, (sem) => ({ ...sem, archivos: [...sem.archivos, archivo] })),

	removeArchivoFromSemana: (semanaId: number, archivoId: number): Mutator =>
		(c) => mapSemana(c, semanaId, (sem) => ({ ...sem, archivos: sem.archivos.filter((a) => a.id !== archivoId) })),

	addTareaToSemana: (semanaId: number, tarea: CursoContenidoTareaDto): Mutator =>
		(c) => mapSemana(c, semanaId, (sem) => ({ ...sem, tareas: [...sem.tareas, tarea] })),

	updateTareaInSemana: (semanaId: number, tareaId: number, updates: Partial<CursoContenidoTareaDto>): Mutator =>
		(c) => mapTareaEnSemana(c, semanaId, tareaId, (t) => ({ ...t, ...updates })),

	removeTareaFromSemana: (semanaId: number, tareaId: number): Mutator =>
		(c) => mapSemana(c, semanaId, (sem) => ({ ...sem, tareas: sem.tareas.filter((t) => t.id !== tareaId) })),

	addArchivoToTarea: (semanaId: number, tareaId: number, archivo: TareaArchivoDto): Mutator =>
		(c) => mapTareaEnSemana(c, semanaId, tareaId, (t) => ({ ...t, archivos: [...t.archivos, archivo] })),

	removeArchivoFromTarea: (semanaId: number, tareaId: number, archivoId: number): Mutator =>
		(c) => mapTareaEnSemana(c, semanaId, tareaId, (t) => ({ ...t, archivos: t.archivos.filter((a) => a.id !== archivoId) })),
};

export type ContenidoMutation = Mutator;
