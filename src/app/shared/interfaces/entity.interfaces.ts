// #region Entity Interfaces
/** Entidad identificable por id numérico */
export interface HasId {
	id: number;
}

/** Entidad con estado activo/inactivo (boolean) */
export interface HasEstadoBoolean {
	estado: boolean;
}

/** Entidad con estado activo/inactivo (numérico 0/1) */
export interface HasEstadoNumeric {
	estado: number;
}

/** Entidad con estado — boolean o numérico según el backend */
export type HasEstado = HasEstadoBoolean | HasEstadoNumeric;

/** Entidad con campos de auditoría */
export interface HasAuditFields {
	usuarioReg?: string;
	fechaReg?: Date | string;
	usuarioMod?: string;
	fechaMod?: Date | string;
}

/** Entidad con control de concurrencia optimista */
export interface HasRowVersion {
	rowVersion?: string;
}

/** Entidad CRUD típica: identificable + estado + auditoría + concurrencia */
export type CrudEntity = HasId & HasEstado & HasAuditFields & HasRowVersion;
// #endregion
