// #region Tareas pendientes (estudiante)
/** Tarea sin entregar del estudiante (`GET /api/estudiantecurso/mis-tareas-pendientes`). */
export interface TareaPendienteDto {
	tareaId: number;
	titulo: string;
	cursoNombre: string;
	/** Ausente en tareas sin fecha límite (el BE las ordena al final). */
	fechaLimite?: string | null;
	horarioId: number;
	cursoId?: number | null;
	/** El estudiante no la abrió y se publicó hace menos de 14 días. */
	esNueva: boolean;
}
// #endregion

// #region Calificaciones pendientes (profesor)
/** Evaluación con estudiantes sin nota (`GET /api/calificacion/pendientes`, solo periodo abierto). */
export interface CalificacionPendienteDto {
	calificacionId: number;
	titulo: string;
	cursoNombre: string;
	horarioId: number;
	cursoId?: number | null;
	numeroSemana: number;
	fechaEvaluacion: string;
	totalEstudiantes: number;
	sinNota: number;
}
// #endregion
