// Contrato de la carga inicial de cobranza (P119 F6a): parámetros del año, generar cargos y confirmar «sin dato».
// Ver `educa-coord/contracts/api-catalog.md` § Pagos.

import type { NivelEducativo } from './classroom.models';

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

// #region Configuración del año (P123 F2)
/** Monto de un concepto en un año. `nivel` ausente o `null` = «Todos los niveles» (el BE omite los nulos del JSON). */
export interface MontoConcepto {
	conceptoId: number;
	nivel?: NivelEducativo | null;
	monto: number;
	rowVersion: string;
}

/** Concepto activo con sus montos del año, en el orden del catálogo. `nombre` llega sin tildes: para mostrar se usa `CONCEPTOS`. */
export interface ConceptoConMontos {
	conceptoId: number;
	codigo: string;
	nombre: string;
	soloAlumnosNuevos: boolean;
	montos: MontoConcepto[];
}

/** Cuota del cronograma. `fechaVencimiento` llega como `YYYY-MM-DDT00:00:00` (fecha civil, sin zona). */
export interface CuotaCronograma {
	numero: number;
	etiqueta: string;
	fechaVencimiento: string;
	rowVersion: string;
}

/** `GET /api/pagos/configuracion/{anio}` y respuesta de los dos `PUT`. `cronograma` vacío si el año no tiene. */
export interface ConfiguracionAnio {
	anio: number;
	conceptos: ConceptoConMontos[];
	cronograma: CuotaCronograma[];
}

/** Fila de `PUT /configuracion/montos`. `rowVersion` nulo solo si la fila no existe; nunca `''` (da 409, INV-S05). */
export interface MontoAGuardar {
	conceptoId: number;
	nivel: NivelEducativo | null;
	monto: number;
	rowVersion: string | null;
}

/** Cuerpo de `PUT /configuracion/montos`: solo las filas nuevas o cambiadas (el BE valida la versión de cada fila enviada). */
export interface GuardarMontosAnioPayload {
	anio: number;
	montos: MontoAGuardar[];
}

/** Cuota de `PUT /configuracion/cronograma`. `fechaVencimiento` = `YYYY-MM-DD` (nunca `toISOString()`). */
export interface CuotaAGuardar {
	numero: number;
	etiqueta: string;
	fechaVencimiento: string;
	rowVersion: string | null;
}

/** Siempre las 10 cuotas: el cronograma se reemplaza entero (INV-PG05). */
export interface GuardarCronogramaAnioPayload {
	anio: number;
	cuotas: CuotaAGuardar[];
}
// #endregion
