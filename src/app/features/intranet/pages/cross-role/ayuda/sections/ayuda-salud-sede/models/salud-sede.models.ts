// #region Salud de sede (POST /api/salud-sede/reportes, GET /api/salud-sede/estado)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda > Salud de sede y
// `Educa.API` SaludSedeDimension/SaludSedeRating/EstadoSaludSedeDto.

/** Nombres del enum `SaludSedeDimension` — viajan como string en el contrato. */
export type SaludSedeDimension = 'Infraestructura' | 'Profesorado' | 'SituacionGeneral';

/** Nombres del enum `SaludSedeRating` — viajan como string en el contrato. */
export type SaludSedeRating = 'Bien' | 'Advertencia' | 'Critico';

/** Todas las dimensiones fijas del catálogo (sin CRUD admin previsto). */
export const SALUD_SEDE_DIMENSIONES: SaludSedeDimension[] = [
	'Infraestructura',
	'Profesorado',
	'SituacionGeneral',
];

/** Etiquetas en español para mostrar en el formulario y en la vista de estado. */
export const SALUD_SEDE_DIMENSION_LABELS: Record<SaludSedeDimension, string> = {
	Infraestructura: 'Infraestructura',
	Profesorado: 'Profesorado',
	SituacionGeneral: 'Situación general',
};

export const SALUD_SEDE_RATING_LABELS: Record<SaludSedeRating, string> = {
	Bien: 'Bien',
	Advertencia: 'Advertencia',
	Critico: 'Crítico',
};

/** Body de `POST /api/salud-sede/reportes`. */
export interface CrearReporteSaludDto {
	dimension: SaludSedeDimension;
	rating: SaludSedeRating;
}

/** Item de `GET /api/salud-sede/estado` — estado vigente por dimensión. */
export interface EstadoSaludSedeDto {
	dimension: SaludSedeDimension;
	rating: SaludSedeRating;
	fechaCalculo: string;
}
// #endregion
