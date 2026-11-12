// #region FAQ + Wizard (GET /api/faq?categoria=&q=)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda y `Educa.API` FaqDto/FaqWizardDto/FaqPasoDto.

export interface FaqPasoDto {
	orden: number;
	texto: string;
	imagenUrl: string | null;
	/** Título real del paso; `null` (o ausente) en guías anteriores a F1 del plan 122. */
	titulo?: string | null;
}

export interface FaqWizardDto {
	titulo: string | null;
	pasos: FaqPasoDto[];
}

export interface FaqDto {
	id: number;
	pregunta: string;
	respuesta: string;
	categoria: string | null;
	/** null cuando la FAQ no tiene wizard asociado (o el wizard está deshabilitado en el BE). */
	wizard: FaqWizardDto | null;
}

/** Motivo (lista cerrada) de un voto «No útil». */
export type FaqMotivo = 'INCOMPLETA' | 'NO_ES_LO_QUE_BUSCO' | 'DESACTUALIZADA';

/** Voto vigente de la persona sobre una pregunta (`GET /api/faq/feedback/mios`). */
export interface FaqVotoDto {
	faqId: number;
	util: boolean;
	motivo?: FaqMotivo | null;
}

/** Voto tal como lo maneja la UI: `motivo` solo existe con `util: false`. */
export interface FaqVoto {
	util: boolean;
	motivo: FaqMotivo | null;
}
// #endregion
