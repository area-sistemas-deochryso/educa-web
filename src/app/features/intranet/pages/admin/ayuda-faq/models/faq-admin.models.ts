// #region FAQ Admin (GET/POST/PUT/DELETE /api/admin/faq*)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda y `Educa.API` FaqAdminDto/CrearFaqDto/
// ActualizarFaqDto/WizardInputDto/WizardPasoInputDto.

/** Paso del wizard tal como lo envía/recibe el admin (editable). */
export interface WizardPasoInput {
	orden: number;
	texto: string;
	imagenUrl: string | null;
}

/** Wizard completo tal como lo envía el admin al crear/editar — se reemplaza en bloque. */
export interface WizardInput {
	titulo: string | null;
	pasos: WizardPasoInput[];
}

/** FAQ para el panel de administración — incluye estado, capability cruda y RowVersion. */
export interface FaqAdminDto {
	id: number;
	pregunta: string;
	respuesta: string;
	categoria: string | null;
	capabilityId: number | null;
	capabilityCodigo: string | null;
	estado: boolean;
	wizard: WizardInput | null;
	rowVersion: string;
}

export interface CrearFaqRequest {
	pregunta: string;
	respuesta: string;
	categoria: string | null;
	capabilityId: number | null;
	wizard: WizardInput | null;
}

export interface ActualizarFaqRequest {
	pregunta: string;
	respuesta: string;
	categoria: string | null;
	capabilityId: number | null;
	wizard: WizardInput | null;
	rowVersion: string;
}

/** Shape del formulario de crear/editar (previo a construir el request). */
export interface FaqAdminFormData {
	pregunta: string;
	respuesta: string;
	categoria: string | null;
	capabilityId: number | null;
	wizard: WizardInput | null;
}
// #endregion
