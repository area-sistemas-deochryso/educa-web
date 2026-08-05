// #region Explicaciones Admin (GET/POST/PUT/DELETE /api/admin/explicaciones*)
// Ver `educa-coord/plans/xrepo-96-modo-informativo-interactivo.md` §F3 y `Educa.API`
// ExplicacionAdminDto/CrearExplicacionDto/ActualizarExplicacionDto.

/** Explicación para el panel de administración — incluye estado, rol/capability crudos y RowVersion. */
export interface ExplicacionAdminDto {
	id: number;
	ancla: string;
	rolId: number | null;
	rolNombre: string | null;
	texto: string;
	capabilityId: number | null;
	capabilityCodigo: string | null;
	estado: boolean;
	rowVersion: string;
}

export interface CrearExplicacionRequest {
	ancla: string;
	rolId: number | null;
	texto: string;
	capabilityId: number | null;
}

export interface ActualizarExplicacionRequest {
	ancla: string;
	rolId: number | null;
	texto: string;
	capabilityId: number | null;
	rowVersion: string;
}

/** Shape del formulario de crear/editar (previo a construir el request). */
export interface ExplicacionAdminFormData {
	ancla: string;
	rolId: number | null;
	texto: string;
	capabilityId: number | null;
}
// #endregion
