// #region Modelos
import type { ReporteTipo } from './feedback-report.tipos';

export const REPORTE_ESTADOS = ['NUEVO', 'REVISADO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO'] as const;
export type ReporteEstado = (typeof REPORTE_ESTADOS)[number];

/** Payload enviado al backend (matches CrearReporteUsuarioDto). */
export interface CrearReporteRequest {
	tipo: ReporteTipo;
	descripcion: string;
	propuesta?: string | null;
	url: string;
	userAgent?: string | null;
	correlationId?: string | null;
	plataforma?: string;
}

/** Estado UI del formulario del dialog. */
export interface ReporteFormData {
	tipo: ReporteTipo | null;
	descripcion: string;
	propuesta: string;
}

/** DTO ligero recibido del backend para el listado admin. */
export interface ReporteUsuarioListaDto {
	id: number;
	tipo: ReporteTipo;
	descripcionResumen: string;
	tienePropuesta: boolean;
	url: string;
	usuarioDni: string | null;
	usuarioRol: string | null;
	usuarioNombre: string | null;
	estado: ReporteEstado;
	fechaReg: string;
}

/** DTO completo para el drawer de detalle admin. */
export interface ReporteUsuarioDetalleDto {
	id: number;
	tipo: ReporteTipo;
	descripcion: string;
	propuesta: string | null;
	url: string;
	userAgent: string | null;
	correlationId: string | null;
	plataforma: string;
	usuarioDni: string | null;
	usuarioRol: string | null;
	usuarioNombre: string | null;
	estado: ReporteEstado;
	observacion: string | null;
	fechaReg: string;
	fechaMod: string | null;
	usuarioMod: string | null;
	rowVersion: string;
}

export interface ReporteUsuarioEstadisticasDto {
	total: number;
	nuevos: number;
	enProgreso: number;
	resueltos: number;
	descartados: number;
}

export interface ActualizarEstadoReporteRequest {
	estado: ReporteEstado;
	observacion?: string | null;
	rowVersion: string;
}
// #endregion
