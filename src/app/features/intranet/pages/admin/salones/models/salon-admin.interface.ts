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
} from '@data/models';

export { NIVELES } from '@data/models';
// #endregion

// #region DTOs admin-only (Crear/Actualizar/Cerrar)
export interface CrearConfiguracionCalificacionDto {
	nivel: string;
	tipoCalificacion: string;
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
	tipoCalificacion: string;
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
