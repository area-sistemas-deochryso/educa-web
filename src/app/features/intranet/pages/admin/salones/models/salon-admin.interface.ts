// #region Re-exports desde @data/models (fuente única de verdad)
export type {
	NivelEducativo,
	SalonAdminListDto,
	ConfiguracionCalificacionListDto,
	ConfiguracionLiteralDto,
	PeriodoAcademicoListDto,
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	AprobacionItemDto,
	AprobacionMasivaResultDto,
	SalonesAdminEstadisticas,
	AprobacionEstado,
	PeriodoCierreEstado,
	TipoCalificacion,
} from '@data/models';

export { NIVELES, APROBACION_ESTADOS, PERIODO_CIERRE_ESTADOS, TIPOS_CALIFICACION } from '@data/models';
// #endregion

// #region DTOs admin-only (Crear/Actualizar/Cerrar)
import type { TipoCalificacion } from '@data/models';

export interface CrearConfiguracionCalificacionDto {
	nivel: string;
	tipoCalificacion: TipoCalificacion;
	notaMinAprobatoria: number | null;
	anio: number;
	literales: CrearConfiguracionLiteralDto[];
}

export interface CrearConfiguracionLiteralDto {
	letra: string;
	descripcion: string;
	notaMinima: number | null;
	notaMaxima: number | null;
	orden: number;
	esAprobatoria: boolean;
}

export interface ActualizarConfiguracionCalificacionDto {
	tipoCalificacion: TipoCalificacion;
	notaMinAprobatoria: number | null;
	literales: CrearConfiguracionLiteralDto[];
}

export interface CrearPeriodoAcademicoDto {
	nombre: string;
	nivel: string;
	anio: number;
	orden: number;
	fechaInicio: string | null;
	fechaFin: string | null;
}

export interface CerrarPeriodoResultDto {
	salonesCreados: number;
	estudiantesPendientes: number;
}
// #endregion
