/**
 * Plan 38 Chat 5 (D11/D12/D17/D20) — DTOs y tipos semánticos del dominio
 * `EmailBlacklist`. Espejo 1:1 del DTO BE `EmailBlacklistListadoDto`
 * (`Educa.API/DTOs/Notifications/EmailBlacklistListadoDto.cs`).
 */

// #region Semantic types
/**
 * Motivos válidos de bloqueo. Alineado con `EmailBlacklistMotivos.cs` del BE
 * y con el CHECK constraint `CK_EmailBlacklist_Motivo`.
 */
export const EMAIL_BLACKLIST_MOTIVOS = [
	'BOUNCE_5XX',
	'BOUNCE_MAILBOX_FULL',
	'MANUAL',
	'BULK_IMPORT',
	'FORMAT_INVALID',
] as const;
export type EmailBlacklistMotivo = (typeof EMAIL_BLACKLIST_MOTIVOS)[number];

/**
 * Subset de motivos que el admin puede elegir manualmente desde el dialog
 * "Agregar a blacklist" (D17.8). Los demás los setea el worker automáticamente
 * (`BOUNCE_5XX` por INV-MAIL02, `BOUNCE_MAILBOX_FULL` por INV-MAIL07,
 * `FORMAT_INVALID` por INV-MAIL01).
 */
export const EMAIL_BLACKLIST_MOTIVOS_MANUALES: readonly EmailBlacklistMotivo[] = [
	'MANUAL',
	'BULK_IMPORT',
];

/** Filtro estado del listado (`activa` = `EBL_Estado=true`). */
export const EMAIL_BLACKLIST_ESTADOS = ['activa', 'inactiva'] as const;
export type EmailBlacklistFiltroEstado = (typeof EMAIL_BLACKLIST_ESTADOS)[number];
// #endregion

// #region DTOs (BE → FE)
/** Espejo de `EmailBlacklistListadoDto`. */
export interface EmailBlacklistEntry {
	id: number;
	correo: string;
	motivo: EmailBlacklistMotivo;
	motivoLabel: string;
	intentosFallidos: number;
	ultimoError: string | null;
	estado: boolean;
	fechaPrimerFallo: string | null;
	fechaUltimoFallo: string | null;
	fechaReg: string;
	fechaMod: string | null;
	usuarioReg: string;
	usuarioMod: string | null;
}

/** Espejo de `DespejarBlacklistResponseDto`. */
export interface DespejarBlacklistResponse {
	id: number;
	correo: string;
	motivoBloqueo: EmailBlacklistMotivo;
	intentosFallidos: number;
	fechaPrimerFallo: string | null;
	fechaUltimoFallo: string | null;
	fechaMod: string | null;
	usuarioMod: string | null;
}
// #endregion

// #region Requests (FE → BE)
/** Espejo de `CrearBlacklistRequest`. */
export interface CrearBlacklistRequest {
	correo: string;
	motivo: EmailBlacklistMotivo;
	observacion?: string | null;
}
// #endregion

// #region UI shapes
/** Estado del formulario del dialog "Agregar a blacklist". */
export interface BlacklistFormData {
	correo: string;
	motivo: EmailBlacklistMotivo | null;
	observacion: string;
}

/** Filtros del listado paginado (sincronizado con `EmailBlacklistFiltro` del BE). */
export interface BlacklistFiltros {
	estado: EmailBlacklistFiltroEstado | null;
	motivo: EmailBlacklistMotivo | null;
	q: string | null;
}

/**
 * Estadísticas locales (computadas en el FE a partir del listado server-paginated).
 * El BE no expone aggregations dedicadas para blacklist hoy — las calculamos sobre
 * la página visible. Es ruido aceptable: solo se usa para el header del tab.
 */
export interface BlacklistEstadisticas {
	total: number;
	activas: number;
	inactivas: number;
}
// #endregion
