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
	/** Palabras clave separadas por `, ` (ya normalizadas por el servidor); `null` si no tiene. */
	palabrasClave?: string | null;
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

// #region Progreso de guías (GET /api/faq/progreso/mios, PUT /api/faq/{id}/progreso)
// Ver `educa-coord/contracts/api-catalog.md` § FAQ. Los pasos se identifican por posición (base 0).

/** Avance de la persona en una guía, tal como lo devuelve el servidor. */
export interface FaqProgresoDto {
	faqId: number;
	hechos: number[];
	actual?: number | null;
	totalPasos: number;
	fecha?: string | null;
}

/** Cuerpo del `PUT`: `hechos` vacío borra el registro («Reiniciar guía»). */
export interface FaqProgresoBody {
	hechos: number[];
	actual?: number;
	totalPasos: number;
}

/** Avance de una guía como lo maneja la UI. */
export interface GuideProgress {
	/** Posición (desde 0) de los pasos marcados como hechos, ascendente. */
	done: number[];
	/** Posición (desde 0) del último paso trabajado, o `null` si todavía no hay ninguno. */
	current: number | null;
}

/** «Nunca vista» no tiene resumen: la lista no la marca. */
export type GuideStatus = 'en-curso' | 'terminada';

/** Lo que la lista y «Retomar» necesitan de una guía con avance, recortado a los pasos actuales. */
export interface GuideSummary {
	status: GuideStatus;
	done: number;
	total: number;
	/** Paso (desde 1) donde seguir: el último trabajado o el primero pendiente. */
	step: number;
	/** ISO de la última actualización; ordena «Retomar». */
	fecha: string;
}
// #endregion
