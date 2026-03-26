// #region Constants
export const ESTADOS_ASISTENCIA_CURSO = ['P', 'T', 'F'] as const;
export type EstadoAsistenciaCurso = (typeof ESTADOS_ASISTENCIA_CURSO)[number];

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistenciaCurso, string> = {
	P: 'Presente',
	T: 'Tarde',
	F: 'Faltó',
};

export const ESTADO_ASISTENCIA_SEVERITIES: Record<EstadoAsistenciaCurso, string> = {
	P: 'success',
	T: 'warn',
	F: 'danger',
};

export const ESTADO_ASISTENCIA_ICONS: Record<EstadoAsistenciaCurso, string> = {
	P: 'pi pi-check-circle',
	T: 'pi pi-clock',
	F: 'pi pi-times-circle',
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
}
// #endregion
