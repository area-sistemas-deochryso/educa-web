// #region Imports
import type { CuotaCronograma, GuardarCronogramaAnioPayload } from '@data/models';
import {
	CUOTAS_POR_ANIO,
	MAX_ETIQUETA,
	esFechaIso,
	etiquetaSugerida,
	fechaConDiaLargo,
	fechaSugerida,
	numeroDiaSemana,
} from './cronograma-fechas.logic';
import { listaLegible } from './seccion.logic';
// #endregion

/**
 * Editor del cronograma de 10 cuotas (P123 F3, INV-PG05): filas con su validación en línea, borrador disperso y
 * payload. El BE informa solo la primera violación y sin decir la cuota, así que la validación por fila se replica
 * acá con las mismas reglas: etiqueta recortada de 1 a 30 caracteres, fecha dentro del año y cada vencimiento
 * después del anterior, sin empates. Sin Angular para poder probarla sola.
 */

// #region Tipos
/** Lo escrito por la persona en una cuota, solo en los campos que tocó (D3). */
export interface CuotaEditada {
	etiqueta?: string;
	fecha?: string;
}

/** Borrador disperso por número de cuota: una cuota sin campos tocados no figura. */
export type BorradorCronograma = Readonly<Record<number, CuotaEditada>>;

export interface IdsCuota {
	etiqueta: string;
	fecha: string;
	dia: string;
	errorEtiqueta: string;
	errorFecha: string;
	avisoEtiqueta: string;
	avisoFecha: string;
}

export interface FilaCuota {
	numero: number;
	ids: IdsCuota;
	/** Valores efectivos: lo escrito o, si no se tocó, la base. `''` = sin fecha. */
	etiqueta: string;
	fecha: string;
	guardada: CuotaCronograma | null;
	/** Lo guardado o, en una cuota sin guardar, la etiqueta sugerida y la fecha vacía. */
	baseEtiqueta: string;
	baseFecha: string;
	/** La fecha completa con el día de la semana, «miércoles 31/03/2027»; `null` sin una fecha válida. */
	dia: string | null;
	errorEtiqueta: string | null;
	errorFecha: string | null;
	avisoEtiqueta: string | null;
	avisoFecha: string | null;
	etiquetaDescribedBy: string | null;
	fechaDescribedBy: string;
	/** Difiere de la base mostrada: cuenta como cambio sin guardar. */
	editada: boolean;
	/** Difiere de lo guardado (una cuota sin guardar siempre): entra al resumen. */
	cambiada: boolean;
}

export interface FaltantesCronograma {
	fechas: number[];
	etiquetas: number[];
}

type CampoCuota = keyof CuotaEditada;

/** Lo que se sabe de una cuota antes de validarla contra las demás. */
interface ValoresCuota {
	numero: number;
	guardada: CuotaCronograma | null;
	baseEtiqueta: string;
	baseFecha: string;
	etiqueta: string;
	fecha: string;
}

interface FechaAnterior {
	numero: number;
	fecha: string;
}
// #endregion

// #region Filas
const NUMEROS_CUOTA: readonly number[] = Array.from({ length: CUOTAS_POR_ANIO }, (_, i) => i + 1);

const normalizada = (etiqueta: string): string => etiqueta.trim().toLocaleLowerCase('es');

/** Siempre las 10 cuotas, de la 1 a la 10, con lo guardado, lo escrito y la validación de cada una. */
export function filasCronograma(
	anio: number,
	cuotas: readonly CuotaCronograma[],
	borrador: BorradorCronograma,
): FilaCuota[] {
	const guardadas = new Map(cuotas.map((c) => [c.numero, c]));
	const valores = NUMEROS_CUOTA.map((n) => valoresCuota(n, guardadas.get(n) ?? null, borrador));
	const repetidas = etiquetasRepetidas(valores);
	const filas: FilaCuota[] = [];
	// Como el BE, cada fecha se compara con la de la cuota anterior; si esa no tiene fecha, con la más
	// cercana que sí la tenga (aunque esa tenga su propio error).
	let anterior: FechaAnterior | null = null;
	for (const v of valores) {
		filas.push(armarFila(anio, v, anterior, repetidas));
		if (esFechaIso(v.fecha)) anterior = { numero: v.numero, fecha: v.fecha };
	}
	return filas;
}

function valoresCuota(
	numero: number,
	guardada: CuotaCronograma | null,
	borrador: BorradorCronograma,
): ValoresCuota {
	const baseEtiqueta = guardada ? guardada.etiqueta : etiquetaSugerida(numero);
	const baseFecha = guardada ? guardada.fechaVencimiento.slice(0, 10) : '';
	const editada: CuotaEditada | undefined = borrador[numero];
	return {
		numero,
		guardada,
		baseEtiqueta,
		baseFecha,
		etiqueta: editada?.etiqueta ?? baseEtiqueta,
		fecha: editada?.fecha ?? baseFecha,
	};
}

function etiquetasRepetidas(valores: readonly ValoresCuota[]): ReadonlySet<string> {
	const vistas = new Set<string>();
	const repetidas = new Set<string>();
	for (const clave of valores.map((v) => normalizada(v.etiqueta))) {
		if (clave !== '' && vistas.has(clave)) repetidas.add(clave);
		vistas.add(clave);
	}
	return repetidas;
}

function armarFila(
	anio: number,
	v: ValoresCuota,
	anterior: FechaAnterior | null,
	repetidas: ReadonlySet<string>,
): FilaCuota {
	const ids = idsCuota(v.numero);
	const fechaValida = esFechaIso(v.fecha);
	const errorEtiqueta = errorDeEtiqueta(v.etiqueta);
	const errorFecha = errorDeFecha(anio, v.fecha, anterior);
	const avisoEtiqueta =
		errorEtiqueta === null && repetidas.has(normalizada(v.etiqueta))
			? `Otra cuota también se llama «${v.etiqueta.trim()}».`
			: null;
	const avisoFecha = errorFecha === null && fechaValida ? avisoDeFecha(v.fecha) : null;
	return {
		...v,
		ids,
		dia: fechaValida ? fechaConDiaLargo(v.fecha) : null,
		errorEtiqueta,
		errorFecha,
		avisoEtiqueta,
		avisoFecha,
		etiquetaDescribedBy:
			unirIds(errorEtiqueta && ids.errorEtiqueta, avisoEtiqueta && ids.avisoEtiqueta) || null,
		fechaDescribedBy: unirIds(
			ids.dia,
			errorFecha && ids.errorFecha,
			avisoFecha && ids.avisoFecha,
		),
		editada: v.etiqueta.trim() !== v.baseEtiqueta.trim() || v.fecha !== v.baseFecha,
		cambiada:
			v.guardada === null ||
			v.etiqueta.trim() !== v.guardada.etiqueta.trim() ||
			v.fecha !== v.baseFecha,
	};
}

function idsCuota(numero: number): IdsCuota {
	const id = `cuota-${numero}`;
	return {
		etiqueta: `${id}-etiqueta`,
		fecha: `${id}-fecha`,
		dia: `${id}-dia`,
		errorEtiqueta: `${id}-error-etiqueta`,
		errorFecha: `${id}-error-fecha`,
		avisoEtiqueta: `${id}-aviso-etiqueta`,
		avisoFecha: `${id}-aviso-fecha`,
	};
}

/** Los ids de los textos que existen, para `aria-describedby`. */
function unirIds(...ids: (string | null)[]): string {
	return ids.filter((id): id is string => !!id).join(' ');
}
// #endregion

// #region Validación de una cuota
/** La etiqueta vacía marca el campo (C15): sin ella el BE rechaza el cronograma entero. */
function errorDeEtiqueta(etiqueta: string): string | null {
	const t = etiqueta.trim();
	if (t === '') return 'Cada cuota necesita una etiqueta, por ejemplo «Marzo».';
	if (t.length > MAX_ETIQUETA) {
		return `La etiqueta admite hasta ${MAX_ETIQUETA} caracteres (tiene ${t.length}).`;
	}
	return null;
}

/** Una fecha vacía no es error de la fila: la informa el motivo de «Revisar cambios». */
function errorDeFecha(anio: number, fecha: string, anterior: FechaAnterior | null): string | null {
	if (fecha === '') return null;
	if (!esFechaIso(fecha)) return 'La fecha no es válida: revisa el día, el mes y el año.';
	if (Number(fecha.slice(0, 4)) !== anio) return `La fecha debe caer en ${anio}.`;
	if (anterior === null || fecha > anterior.fecha) return null;
	if (fecha === anterior.fecha) {
		return `Vence el mismo día que la cuota ${anterior.numero}: cada cuota debe vencer después de la anterior.`;
	}
	return `Debe vencer después de la cuota ${anterior.numero} (${fechaConDiaLargo(anterior.fecha)}).`;
}

function avisoDeFecha(fecha: string): string | null {
	const dia = numeroDiaSemana(fecha);
	if (dia === 6) return 'Cae sábado: el colegio suele moverla al viernes anterior.';
	if (dia === 0) return 'Cae domingo: revisa si corresponde el viernes anterior.';
	return null;
}
// #endregion

// #region Borrador
/**
 * Solo se quita lo exactamente igual a la base: si se comparara recortando, `ngModel` reescribiría el input y se
 * comería el espacio que la persona está tipeando.
 */
export function conEtiqueta(
	borrador: BorradorCronograma,
	fila: Pick<FilaCuota, 'numero' | 'baseEtiqueta'>,
	texto: string,
): BorradorCronograma {
	return conCampo(borrador, fila.numero, 'etiqueta', texto === fila.baseEtiqueta ? null : texto);
}

export function conFecha(
	borrador: BorradorCronograma,
	fila: Pick<FilaCuota, 'numero' | 'baseFecha'>,
	iso: string,
): BorradorCronograma {
	return conCampo(borrador, fila.numero, 'fecha', iso === fila.baseFecha ? null : iso);
}

/**
 * Completa con la fecha habitual solo las cuotas sin fecha y nunca pisa lo tipeado (U4). Pasa por `conFecha`
 * (C16): una sugerida igual a la guardada sale del borrador.
 */
export function rellenarFechas(
	anio: number,
	filas: readonly FilaCuota[],
	borrador: BorradorCronograma,
): BorradorCronograma {
	return filas
		.filter((f) => f.fecha === '')
		.reduce((b, f) => conFecha(b, f, fechaSugerida(anio, f.numero)), borrador);
}

/** `valor` nulo quita el campo; una cuota sin campos sale del borrador. */
function conCampo(
	borrador: BorradorCronograma,
	numero: number,
	campo: CampoCuota,
	valor: string | null,
): BorradorCronograma {
	const actual: CuotaEditada | undefined = borrador[numero];
	const cuota: CuotaEditada = { ...actual };
	if (valor === null) delete cuota[campo];
	else cuota[campo] = valor;
	const { [numero]: _anterior, ...resto } = borrador;
	return cuota.etiqueta === undefined && cuota.fecha === undefined
		? resto
		: { ...resto, [numero]: cuota };
}
// #endregion

// #region Validación del conjunto
export function faltantesCronograma(filas: readonly FilaCuota[]): FaltantesCronograma {
	return {
		fechas: filas.filter((f) => f.fecha === '').map((f) => f.numero),
		etiquetas: filas.filter((f) => f.etiqueta.trim() === '').map((f) => f.numero),
	};
}

export function cuotasConError(filas: readonly FilaCuota[]): number {
	return filas.filter((f) => f.errorEtiqueta !== null || f.errorFecha !== null).length;
}

export function hayCambiosCronograma(filas: readonly FilaCuota[]): boolean {
	return filas.some((f) => f.editada);
}

/** Por qué «Revisar cambios» está deshabilitado; `null` si nada lo impide. */
export function motivoNoRevisarCronograma(
	filas: readonly FilaCuota[],
	baseIncierta: boolean,
): string | null {
	if (baseIncierta) {
		return 'Vuelve a leer el cronograma antes de guardar: no se pudo confirmar qué quedó guardado.';
	}
	const { fechas, etiquetas } = faltantesCronograma(filas);
	if (fechas.length === CUOTAS_POR_ANIO) {
		return `Faltan las fechas de las ${CUOTAS_POR_ANIO} cuotas: escríbelas o usa «Proponer fechas habituales».`;
	}
	if (fechas.length === 1) return `Falta la fecha de la cuota ${fechas[0]}.`;
	if (fechas.length > 1) return `Faltan las fechas de las cuotas ${numerosLegibles(fechas)}.`;
	if (etiquetas.length === 1) return `Falta la etiqueta de la cuota ${etiquetas[0]}.`;
	if (etiquetas.length > 1) {
		return `Faltan las etiquetas de las cuotas ${numerosLegibles(etiquetas)}.`;
	}
	const errores = cuotasConError(filas);
	if (errores === 1) return 'Corrige la cuota marcada para revisar los cambios.';
	if (errores > 1) return `Corrige las ${errores} cuotas marcadas para revisar los cambios.`;
	return null;
}

/** «3», «3 y 4», «3, 4 y 7». */
export function numerosLegibles(numeros: readonly number[]): string {
	return listaLegible(numeros.map(String));
}
// #endregion

// #region Payload
/**
 * Siempre las 10 cuotas en orden: el cronograma se reemplaza entero. `rowVersion` va nulo solo en una cuota
 * sin guardar (INV-S05); la etiqueta, recortada como la guarda el BE.
 */
export function armarPayloadCronograma(
	anio: number,
	filas: readonly FilaCuota[],
): GuardarCronogramaAnioPayload {
	return {
		anio,
		cuotas: filas.map((f) => ({
			numero: f.numero,
			etiqueta: f.etiqueta.trim(),
			fechaVencimiento: f.fecha,
			rowVersion: f.guardada?.rowVersion ?? null,
		})),
	};
}
// #endregion
