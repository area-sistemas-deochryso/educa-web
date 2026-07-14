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
	BatchCommandResult,
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

// #region Nuevo Salón (brief 436)
export interface CrearSalonDto {
	gradoId: number;
	seccionId: number;
	sedeId: number;
	anio: number;
}

export interface SeccionSimpleDto {
	id: number;
	nombre: string;
}
// #endregion

// #region Gestión de estudiantes en curso (brief 436)
export interface SalonEstudianteListDto {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	estadoMatricula: string;
}

export interface EstudianteDisponibleDto {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
}

export interface TransferirEstudianteSalonDto {
	salonDestinoId: number;
	confirmar: boolean;
}

export interface RetirarEstudianteSalonDto {
	motivo: string;
	confirmar: boolean;
}

export interface AccionEstudianteSalonResponseDto {
	ejecutado: boolean;
	requiereConfirmacion: boolean;
	advertencias: string[];
}

export const MOTIVOS_RETIRO = [
	{ value: 'CAMBIO_COLEGIO', label: 'Cambio de colegio' },
	{ value: 'ERROR_MATRICULA', label: 'Error de matrícula' },
	{ value: 'MUDANZA', label: 'Mudanza' },
	{ value: 'OTRO', label: 'Otro' },
] as const;
// #endregion
