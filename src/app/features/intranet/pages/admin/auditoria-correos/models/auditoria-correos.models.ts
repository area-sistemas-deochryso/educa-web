// #region Tipos semánticos
export const TIPOS_ORIGEN_AUDITORIA = ['Estudiante', 'Apoderado', 'Profesor'] as const;
export type TipoOrigenAuditoria = (typeof TIPOS_ORIGEN_AUDITORIA)[number];

export const TIPOS_FALLO_AUDITORIA = ['FAILED_NO_EMAIL', 'FAILED_INVALID_ADDRESS'] as const;
export type TipoFalloAuditoria = (typeof TIPOS_FALLO_AUDITORIA)[number];

export const TIPO_FALLO_LABEL: Record<TipoFalloAuditoria, string> = {
	FAILED_NO_EMAIL: 'Sin correo',
	FAILED_INVALID_ADDRESS: 'Formato inválido',
};

export const TIPO_FALLO_SEVERITY: Record<TipoFalloAuditoria, 'danger' | 'warn'> = {
	FAILED_NO_EMAIL: 'danger',
	FAILED_INVALID_ADDRESS: 'warn',
};
// #endregion

// #region DTOs
/**
 * Espejo FE del DTO `AuditoriaCorreoAsistenciaDto` del BE
 * (Plan 22 Chat 5, `GET /api/sistema/auditoria-correos-asistencia`).
 *
 * DNI y correo vienen YA enmascarados del backend — NO duplicar enmascaramiento
 * en FE. Mostrar tal cual. Ver DTO en `Educa.API/DTOs/Sistema/AuditoriaCorreoAsistenciaDto.cs`.
 */
export interface AuditoriaCorreoAsistenciaDto {
	tipoOrigen: TipoOrigenAuditoria;
	entidadId: number;
	/** DNI enmascarado por el BE → "***1234". */
	dni: string;
	nombreCompleto: string;
	/** Correo enmascarado por el BE → "pa***el@gmail.com". */
	correoActual: string;
	tipoFallo: TipoFalloAuditoria;
	razon: string;
}
// #endregion
