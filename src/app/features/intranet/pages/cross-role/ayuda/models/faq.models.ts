// #region FAQ + Wizard (GET /api/faq?categoria=&q=)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda y `Educa.API` FaqDto/FaqWizardDto/FaqPasoDto.

export interface FaqPasoDto {
	orden: number;
	texto: string;
	imagenUrl: string | null;
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
// #endregion
