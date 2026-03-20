// #region Tipos de nivel
export type NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria';

export const NIVELES: NivelEducativo[] = ['Inicial', 'Primaria', 'Secundaria'];
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
	estadoPeriodo: string;
}
// #endregion

// #region Configuración de Calificación
export interface ConfiguracionCalificacionListDto {
	id: number;
	nivel: string;
	tipoCalificacion: string;
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
	nivel: string;
	anio: number;
	orden: number;
	fechaInicio: string | null;
	fechaFin: string | null;
	estadoCierre: string;
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
	estado: string;
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
	estado: string;
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
	estado: string;
	esVacacional: boolean;
	promedioFinal: number | null;
	observacion: string | null;
}

export interface AprobacionMasivaResultDto {
	aprobados: number;
	desaprobados: number;
	errores: number;
	mensajes: string[];
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
