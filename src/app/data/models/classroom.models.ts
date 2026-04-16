// #region Tipos de nivel
export type NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria';

export const NIVELES: NivelEducativo[] = ['Inicial', 'Primaria', 'Secundaria'];
// #endregion

// #region Tipos semánticos de dominio
export const APROBACION_ESTADOS = ['APROBADO', 'DESAPROBADO', 'PENDIENTE'] as const;
export type AprobacionEstado = (typeof APROBACION_ESTADOS)[number];

export const PERIODO_CIERRE_ESTADOS = ['CERRADO', 'ABIERTO'] as const;
export type PeriodoCierreEstado = (typeof PERIODO_CIERRE_ESTADOS)[number];

export const TIPOS_CALIFICACION = ['NUMERICO', 'LITERAL'] as const;
export type TipoCalificacion = (typeof TIPOS_CALIFICACION)[number];

/** Modo de asignación profesor-salón según GRA_Orden del grado. */
export const MODOS_ASIGNACION = ['TutorPleno', 'PorCurso', 'Flexible'] as const;
export type ModoAsignacion = (typeof MODOS_ASIGNACION)[number];

/** Umbral inclusivo: GRA_Orden ≤ 7 → TutorPleno, ≥ 8 → PorCurso, sección V → Flexible. */
export const UMBRAL_TUTOR_PLENO = 7;

/**
 * Resuelve el modo de asignación profesor-salón-curso.
 * Replica la lógica de `ModoAsignacionResolver.cs` del backend.
 */
export function resolveModoAsignacion(gradoOrden: number, seccion: string | null): ModoAsignacion {
  if (seccion?.trim().toUpperCase() === 'V') return 'Flexible';
  return gradoOrden <= UMBRAL_TUTOR_PLENO ? 'TutorPleno' : 'PorCurso';
}
// #endregion

// #region Salón Admin
export interface SalonAdminListDto {
	id: number;
	grado: string;
	gradoOrden: number;
	seccion: string;
	sede: string;
	anio: number;
	estado: boolean;
	tutorNombre: string | null;
	totalEstudiantes: number;
	aprobados: number;
	desaprobados: number;
	pendientes: number;
	estadoPeriodo: PeriodoCierreEstado;
}
// #endregion

// #region Configuración de Calificación
export interface ConfiguracionCalificacionListDto {
	id: number;
	nivel: NivelEducativo;
	tipoCalificacion: TipoCalificacion;
	notaMinAprobatoria: number | null;
	anio: number;
	estado: boolean;
	literales: ConfiguracionLiteralDto[];
}

export interface ConfiguracionLiteralDto {
	id: number;
	letra: string;
	descripcion: string;
	notaMinima: number | null;
	notaMaxima: number | null;
	orden: number;
	esAprobatoria: boolean;
}
// #endregion

// #region Periodo Académico
export interface PeriodoAcademicoListDto {
	id: number;
	nombre: string;
	nivel: NivelEducativo;
	anio: number;
	orden: number;
	fechaInicio: string | null;
	fechaFin: string | null;
	estadoCierre: PeriodoCierreEstado;
	fechaCierre: string | null;
	usuarioCierre: string | null;
}
// #endregion

// #region Aprobación de Estudiantes
export interface AprobacionEstudianteListDto {
	id: number;
	estudianteId: number;
	estudianteDni: string;
	estudianteNombre: string;
	salonId: number;
	salonDescripcion: string;
	periodoId: number;
	estado: AprobacionEstado;
	esVacacional: boolean;
	salonDestinoId: number | null;
	salonDestinoDescripcion: string | null;
	promedioFinal: number | null;
	observacion: string | null;
}

export interface AprobarEstudianteDto {
	estudianteId: number;
	salonId: number;
	periodoId: number;
	estado: AprobacionEstado;
	esVacacional: boolean;
	promedioFinal: number | null;
	observacion: string | null;
}

export interface AprobacionMasivaDto {
	salonId: number;
	periodoId: number;
	aprobaciones: AprobacionItemDto[];
}

export interface AprobacionItemDto {
	estudianteId: number;
	estado: AprobacionEstado;
	esVacacional: boolean;
	promedioFinal: number | null;
	observacion: string | null;
}

/** @deprecated Reemplazado por BatchCommandResult */
export interface AprobacionMasivaResultDto {
	aprobados: number;
	desaprobados: number;
	errores: number;
	mensajes: string[];
}

export interface CommandItemResult {
	itemId: number;
	success: boolean;
	message: string;
	errorCode: string | null;
}

export interface BatchCommandResult {
	batchId: string;
	total: number;
	succeeded: number;
	failed: number;
	durationMs: number;
	items: CommandItemResult[];
}
// #endregion

// #region Estadísticas
export interface SalonesAdminEstadisticas {
	totalSalones: number;
	totalEstudiantes: number;
	totalAprobados: number;
	totalDesaprobados: number;
	totalPendientes: number;
}
// #endregion
