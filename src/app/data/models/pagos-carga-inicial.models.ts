// Contrato de la carga inicial de cobranza (P119 F6a): parámetros del año, generar cargos y confirmar «sin dato».
// Ver `educa-coord/contracts/api-catalog.md` § Pagos.

// #region Carga inicial (F6a)
/** Conceptos que el BE sabe generar. Útiles todavía no (`CARGO_GENERACION_UTILES_NO_DISPONIBLE`). */
export type ConceptoGenerable = 'MATRICULA' | 'INSCRIPCION' | 'PENSION';

/** `GET /api/pagos/parametros/{anio}`. `fechaInicial` es una fecha civil (`YYYY-MM-DD`, posible sufijo de hora). */
export interface ParametroAnio {
	anio: number;
	pagoMinimoPartes: number;
	montoRecargo: number;
	fechaInicial: string | null;
	rowVersion: string;
}

/** Cuerpo de `PUT /api/pagos/parametros`. `rowVersion` nulo solo al crear el año. */
export interface GuardarParametroAnioPayload {
	anio: number;
	pagoMinimoPartes: number;
	montoRecargo: number;
	fechaInicial: string | null;
	rowVersion: string | null;
}

/** Cuerpo de `POST /api/pagos/cargos/generar/vista-previa` (y de `generar`, con `crearEsperados`). */
export interface GenerarCargosPayload {
	anio: number;
	conceptos: ConceptoGenerable[] | null;
	salonId: number | null;
	inscripcionEstudianteIds: number[] | null;
}

export interface ConteoConcepto {
	concepto: string;
	aCrear: number;
	yaExisten: number;
}

export type MotivoOmision = 'SIN_CRONOGRAMA' | 'SIN_MONTO' | 'INSCRIPCION_ALUMNO_NO_MATRICULADO';

export interface CargoOmitido {
	motivo: MotivoOmision;
	concepto: string | null;
	cantidad: number;
}

export interface VistaPreviaGeneracion {
	anio: number;
	aCrear: number;
	yaExisten: number;
	nacenSinDato: number;
	nacenConfirmados: number;
	porConcepto: ConteoConcepto[];
	omitidos: CargoOmitido[];
}

export interface ResultadoGeneracion {
	anio: number;
	creados: number;
	yaExisten: number;
}

/** Filtros de la confirmación en bloque; se combinan con AND y hace falta al menos uno además del año. */
export interface FiltroSinDato {
	anio: number;
	salonId: number | null;
	estudianteId: number | null;
	concepto: ConceptoGenerable | null;
	cuotaDesde: number | null;
	cuotaHasta: number | null;
	cargoIds: number[] | null;
}

export type DesenlaceSinDato = 'DEBE' | 'SALDADO';

export interface VistaPreviaConfirmacion {
	cargos: number;
	alumnos: number;
	porConcepto: { concepto: string; cargos: number }[];
}

export interface ConfirmarSinDatoPayload {
	filtro: FiltroSinDato;
	desenlace: DesenlaceSinDato;
	motivo: string | null;
	cargosEsperados: number;
}

export interface ResultadoConfirmacion {
	desenlace: DesenlaceSinDato;
	confirmados: number;
	omitidos: number;
}
// #endregion
