// #region Constants
export const ESTADOS_ASISTENCIA_CURSO = ['P', 'T', 'F', 'J'] as const;
export type EstadoAsistenciaCurso = (typeof ESTADOS_ASISTENCIA_CURSO)[number];

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistenciaCurso, string> = {
	P: 'Presente',
	T: 'Tarde',
	F: 'Faltó',
	J: 'Justificado',
};

export const ESTADO_ASISTENCIA_SEVERITIES: Record<EstadoAsistenciaCurso, string> = {
	P: 'success',
	T: 'warn',
	F: 'danger',
	J: 'info',
};

export const ESTADO_ASISTENCIA_ICONS: Record<EstadoAsistenciaCurso, string> = {
	P: 'pi pi-check-circle',
	T: 'pi pi-clock',
	F: 'pi pi-times-circle',
	J: 'pi pi-file-check',
};
// #endregion

// #region Response DTOs
export interface AsistenciaCursoEstudianteDto {
	estudianteId: number;
	nombreCompleto: string;
	dni: string;
	estado: EstadoAsistenciaCurso;
	justificacion: string | null;
}

export interface AsistenciaCursoFechaDto {
	horarioId: number;
	fecha: string;
	cursoNombre: string;
	salonDescripcion: string;
	estudiantes: AsistenciaCursoEstudianteDto[];
	/** false = lista sin guardar (defaults). undefined = backend sin el flag desplegado todavía. */
	tieneRegistros?: boolean;
	/** `INV-AC10`: la fecha guardada es una clase de recuperación (fuera del día de horario). Ausente en un BE anterior a P110-F5. */
	esRecuperacion?: boolean;
	motivoRecuperacion?: string | null;
}

export interface AsistenciaCursoResumenEstudianteDto {
	estudianteId: number;
	nombreCompleto: string;
	dni: string;
	totalPresente: number;
	totalTarde: number;
	totalFalto: number;
	totalClases: number;
}

export interface AsistenciaCursoResumenDto {
	horarioId: number;
	cursoNombre: string;
	salonDescripcion: string;
	totalClases: number;
	estudiantes: AsistenciaCursoResumenEstudianteDto[];
}
// #endregion

// #region Request DTOs
export interface AsistenciaCursoItemDto {
	estudianteId: number;
	estado: EstadoAsistenciaCurso;
	justificacion: string | null;
}

export interface RegistrarAsistenciaCursoDto {
	fecha: string;
	asistencias: AsistenciaCursoItemDto[];
	/** Fuera del día de horario solo se acepta con `esRecuperacion: true` y `motivo` ≥10 caracteres (`INV-AC10`). */
	esRecuperacion?: boolean;
	motivo?: string;
}
// #endregion
