// #region Response DTOs

export interface HealthExitPermissionDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	fecha: string;
	horaSalida: string;
	sintomas: string[];
	sintomasDisplay: string;
	sintomaDetalle: string | null;
	observacion: string | null;
	profesorNombre: string;
	estado: boolean;
}

export interface HealthJustificationDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	documentoUrl: string;
	documentoNombre: string;
	observacion: string | null;
	dias: HealthJustificationDayDto[];
	profesorNombre: string;
	fechaRegistro: string;
	estado: boolean;
}

export interface HealthJustificationDayDto {
	fecha: string;
	estadoOriginal: string;
}

export interface HealthPermissionSummaryDto {
	permisosSalida: HealthExitPermissionDto[];
	justificaciones: HealthJustificationDto[];
}

export interface StudentForHealthDto {
	id: number;
	dni: string;
	nombreCompleto: string;
	tieneEntradaHoy: boolean;
}

export interface SymptomDto {
	codigo: string;
	nombre: string;
}

export interface DateValidationResult {
	fecha: string;
	valida: boolean;
	razon: string | null;
}

// #endregion

// #region Request DTOs

export interface CreateHealthExitRequest {
	estudianteId: number;
	salonId: number;
	sintomas: string[];
	sintomaDetalle?: string;
	observacion?: string;
}

export interface CreateHealthJustificationRequest {
	estudianteId: number;
	salonId: number;
	fechas: string[];
	observacion?: string;
}

export interface ValidateDatesRequest {
	estudianteId: number;
	fechas: string[];
}

// #endregion
