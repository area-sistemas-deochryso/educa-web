// #region Imports
import type {
	CargoOmitido,
	ConceptoGenerable,
	ConfirmarSinDatoPayload,
	DesenlaceSinDato,
	FiltroSinDato,
	GenerarCargosPayload,
	GuardarParametroAnioPayload,
	ParametroAnio,
} from '@data/models';
// #endregion

/**
 * Lógica pura de la carga inicial (P119 F6b): parámetros del año, generar cargos y confirmar «sin dato» en bloque.
 * Sin Angular para poder probarla sola. El BE decide siempre; acá solo se evita mandar lo evidentemente inválido
 * y se traducen los `errorCode` a español.
 */

// #region Opciones
export const CONCEPTOS: readonly { label: string; value: ConceptoGenerable }[] = [
	{ label: 'Matrícula', value: 'MATRICULA' },
	{ label: 'Inscripción', value: 'INSCRIPCION' },
	{ label: 'Pensión', value: 'PENSION' },
];

export const DESENLACES: { value: DesenlaceSinDato; label: string; detalle: string }[] = [
	{ value: 'DEBE', label: 'Debe', detalle: 'Los cargos pasan a confirmados y son deuda normal (una cuota ya vencida lleva su recargo).' },
	{
		value: 'SALDADO',
		label: 'Saldado antes del arranque',
		detalle: 'Los cargos quedan cubiertos sin dinero registrado: no generan pago ni suman a «cobrado». Se puede anular después.',
	},
];

/** Año anterior, actual y siguiente: el arranque del año nuevo se prepara antes de que empiece. */
export function opcionesAnio(hoy: Date): number[] {
	const y = hoy.getFullYear();
	return [y - 1, y, y + 1];
}

export function etiquetaConcepto(concepto: string | null | undefined): string {
	return CONCEPTOS.find((c) => c.value === concepto)?.label ?? concepto ?? '—';
}
// #endregion

// #region Fechas
/** `YYYY-MM-DD` con los campos locales: la fecha civil que la persona eligió, sin pasar por UTC. */
export function isoLocal(fecha: Date): string {
	const y = fecha.getFullYear();
	const m = String(fecha.getMonth() + 1).padStart(2, '0');
	const d = String(fecha.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Lee la parte de fecha de `YYYY-MM-DD` o ISO como fecha civil local. `null` si no es una fecha. */
export function fechaDesdeIso(iso: string | null | undefined): Date | null {
	if (!iso) return null;
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
}

/** La fecha inicial es opcional, pero si se informa debe caer en el año (`INV-PG14`). */
export function fechaInicialEnAnio(fecha: Date | null, anio: number): boolean {
	return fecha === null || fecha.getFullYear() === anio;
}
// #endregion

// #region Parámetros del año
export interface DatosParametros {
	anio: number;
	pagoMinimoPartes: number | null;
	montoRecargo: number | null;
	fechaInicial: Date | null;
}

const centavos = (soles: number): number => Math.round(soles * 100);
const hasta2Decimales = (valor: number): boolean => Math.abs(valor * 100 - centavos(valor)) < 1e-6;

/** No negativos y con a lo sumo 2 decimales (`INV-PG07`); la fecha inicial, si está, dentro del año. */
export function parametrosValidos(d: DatosParametros): boolean {
	const { pagoMinimoPartes, montoRecargo } = d;
	if (pagoMinimoPartes === null || montoRecargo === null) return false;
	if (pagoMinimoPartes < 0 || montoRecargo < 0) return false;
	if (!hasta2Decimales(pagoMinimoPartes) || !hasta2Decimales(montoRecargo)) return false;
	return fechaInicialEnAnio(d.fechaInicial, d.anio);
}

/** `rowVersion` va nulo solo cuando el año todavía no tiene fila; al editar es el último leído. */
export function armarPayloadParametros(d: DatosParametros, existente: ParametroAnio | null): GuardarParametroAnioPayload {
	return {
		anio: d.anio,
		pagoMinimoPartes: d.pagoMinimoPartes ?? 0,
		montoRecargo: d.montoRecargo ?? 0,
		fechaInicial: d.fechaInicial ? isoLocal(d.fechaInicial) : null,
		rowVersion: existente?.rowVersion ?? null,
	};
}
// #endregion

// #region Generar cargos
/**
 * Sin conceptos elegidos el BE entiende «todos»; acá se exige elegir al menos uno para que la persona decida a conciencia.
 * La inscripción solo nace para los alumnos elegidos (D5): sin concepto `INSCRIPCION` esa lista no viaja.
 */
export function armarPayloadGeneracion(
	anio: number,
	conceptos: readonly ConceptoGenerable[],
	inscripcionEstudianteIds: readonly number[],
): GenerarCargosPayload {
	const incluyeInscripcion = conceptos.includes('INSCRIPCION');
	return {
		anio,
		conceptos: [...conceptos],
		salonId: null,
		inscripcionEstudianteIds: incluyeInscripcion && inscripcionEstudianteIds.length > 0 ? [...inscripcionEstudianteIds] : null,
	};
}

const MOTIVOS_OMISION: Readonly<Record<CargoOmitido['motivo'], string>> = {
	SIN_CRONOGRAMA: 'Sin cronograma del año: no hay cuotas de pensión que generar.',
	SIN_MONTO: 'Sin monto definido para el año y nivel.',
	INSCRIPCION_ALUMNO_NO_MATRICULADO: 'Alumno elegido para inscripción sin matrícula en el año.',
};

export function describirOmision(o: Pick<CargoOmitido, 'motivo' | 'concepto' | 'cantidad'>): string {
	const motivo = MOTIVOS_OMISION[o.motivo] ?? o.motivo;
	const concepto = o.concepto ? `${etiquetaConcepto(o.concepto)}: ` : '';
	return `${concepto}${motivo} (${o.cantidad})`;
}
// #endregion

// #region Confirmar sin dato
export interface DatosConfirmacion {
	anio: number;
	salonId: number | null;
	concepto: ConceptoGenerable | null;
	cuotaDesde: number | null;
	cuotaHasta: number | null;
}

export function armarFiltroSinDato(d: DatosConfirmacion): FiltroSinDato {
	return {
		anio: d.anio,
		salonId: d.salonId,
		estudianteId: null,
		concepto: d.concepto,
		cuotaDesde: d.cuotaDesde,
		cuotaHasta: d.cuotaHasta,
		cargoIds: null,
	};
}

/** El BE exige al menos un filtro además del año (`CARGO_CONFIRMACION_SIN_FILTRO`): evita ofrecer la vista previa sin uno. */
export function tieneFiltroAdemasDelAnio(d: DatosConfirmacion): boolean {
	return d.salonId !== null || d.concepto !== null || d.cuotaDesde !== null || d.cuotaHasta !== null;
}

export function rangoCuotasValido(desde: number | null, hasta: number | null): boolean {
	if (desde !== null && desde < 1) return false;
	if (hasta !== null && hasta < 1) return false;
	return desde === null || hasta === null || desde <= hasta;
}

export function armarPayloadConfirmacion(
	filtro: FiltroSinDato,
	desenlace: DesenlaceSinDato,
	motivo: string,
	cargosEsperados: number,
): ConfirmarSinDatoPayload {
	return { filtro, desenlace, motivo: motivo.trim() || null, cargosEsperados };
}

/** «1 cargo» / «N cargos». */
export const cantidadCargos = (n: number): string => (n === 1 ? '1 cargo' : `${n} cargos`);

/** La frase del botón y del conteo previo: «N cargos de M alumnos». */
export function resumenConfirmacion(cargos: number, alumnos: number): string {
	const c = cantidadCargos(cargos);
	const a = alumnos === 1 ? '1 alumno' : `${alumnos} alumnos`;
	return `${c} de ${a}`;
}
// #endregion

// #region Errores
export interface ErrorHttpLike {
	status?: number;
	error?: { errorCode?: string } | null;
}

export type AccionCargaInicial = 'cargar-parametros' | 'guardar-parametros' | 'vista-previa' | 'generar' | 'confirmar';

const MENSAJES_POR_CODIGO: Readonly<Record<string, string>> = {
	PAGO_PARAMETRO_VALOR_INVALIDO: 'Los valores no pueden ser negativos y admiten como máximo dos decimales.',
	PAGO_PARAMETRO_FECHA_INICIAL_FUERA_DE_ANIO: 'La fecha inicial debe caer dentro del año elegido.',
	PAGO_PARAMETRO_CONFLICTO: 'Otra persona modificó los parámetros al mismo tiempo. Se recargaron: revísalos y vuelve a guardar.',
	PAGO_PARAMETRO_ANIO_INEXISTENTE: 'Ese año todavía no tiene parámetros de cobranza. Guárdalos primero.',
	CARGO_GENERACION_CONCEPTO_INVALIDO: 'Alguno de los conceptos elegidos no se puede generar.',
	CARGO_GENERACION_UTILES_NO_DISPONIBLE: 'Los cargos de útiles todavía no se generan.',
	CARGO_GENERACION_VISTA_PREVIA_DESACTUALIZADA: 'Los datos cambiaron desde la vista previa. Se recalculó: revisa los números y confirma de nuevo.',
	CARGO_CONFIRMACION_DESENLACE_INVALIDO: 'Elige si los cargos quedan como «Debe» o «Saldado antes del arranque».',
	CARGO_CONFIRMACION_SIN_FILTRO: 'Elige al menos un filtro además del año (salón, concepto o cuotas).',
	CARGO_CONFIRMACION_VISTA_PREVIA_DESACTUALIZADA: 'Los datos cambiaron desde la vista previa. Se recalculó: revisa los números y confirma de nuevo.',
};

const MENSAJE_RED: Readonly<Record<AccionCargaInicial, string>> = {
	'cargar-parametros': 'No hubo respuesta del servidor. Intenta de nuevo.',
	'guardar-parametros': 'No hubo respuesta del servidor. Recarga los parámetros y revisa si quedaron guardados antes de repetir.',
	'vista-previa': 'No hubo respuesta del servidor. Intenta de nuevo.',
	generar: 'No hubo respuesta del servidor. Vuelve a calcular la vista previa: si los cargos ya se crearon, aparecerán como «ya existen».',
	confirmar: 'No hubo respuesta del servidor. Vuelve a calcular la vista previa: si ya se confirmaron, el conteo bajará.',
};

const MENSAJE_GENERICO: Readonly<Record<AccionCargaInicial, string>> = {
	'cargar-parametros': 'No se pudieron cargar los parámetros del año.',
	'guardar-parametros': 'No se pudieron guardar los parámetros. Revisa los datos e intenta de nuevo.',
	'vista-previa': 'No se pudo calcular la vista previa.',
	generar: 'No se pudieron generar los cargos. Intenta de nuevo.',
	confirmar: 'No se pudieron confirmar los cargos. Intenta de nuevo.',
};

/** Mensaje en español por `errorCode`. Nunca se muestra el texto crudo del servidor. */
export function mensajeDeError(err: ErrorHttpLike | null | undefined, accion: AccionCargaInicial): string {
	if (!err) return MENSAJE_GENERICO[accion];
	if (err.status === 0) return MENSAJE_RED[accion];
	const codigo = err.error?.errorCode;
	if (codigo && MENSAJES_POR_CODIGO[codigo]) return MENSAJES_POR_CODIGO[codigo];
	if (err.status === 409) return 'Otra persona modificó los datos al mismo tiempo. Revisa y vuelve a intentarlo.';
	return MENSAJE_GENERICO[accion];
}

/** Tras este `409` el conteo mostrado ya no es el real: la pantalla debe recalcular la vista previa. */
export function vistaPreviaDesactualizada(err: ErrorHttpLike | null | undefined): boolean {
	return err?.status === 409 && (err.error?.errorCode ?? '').endsWith('_VISTA_PREVIA_DESACTUALIZADA');
}

/** `404 PAGO_PARAMETRO_ANIO_INEXISTENTE` al leer no es un error: el año aún no tiene fila y se muestra el formulario vacío. */
export function anioSinParametros(err: ErrorHttpLike | null | undefined): boolean {
	return err?.status === 404 && err.error?.errorCode === 'PAGO_PARAMETRO_ANIO_INEXISTENTE';
}
// #endregion
