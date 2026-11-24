// #region Imports
import type { ConceptoConMontos, GuardarMontosAnioPayload } from '@data/models';

import { type ErrorHttpLike, mensajeDeError } from '../utils/carga-inicial.logic';
import { formatSoles } from '../utils/pagos-format.util';
import {
	type BorradorMontos,
	type CambioMonto,
	type ClaveMonto,
	CUOTAS_PENSION,
	NIVELES_MONTO,
	armarPayloadMontos,
	claveMonto,
	nombreConcepto,
} from './montos-anio.logic';
import { type MensajeSeccion, listaLegible } from './seccion.logic';
// #endregion

/**
 * Resumen de los montos antes de guardar, textos de resultado y relectura (P123 F3, INV-PG06). El modo revisión
 * congela el payload: lo que se ve es exactamente lo que viaja, porque F2 no tiene vista previa en el BE. Sin Angular
 * para poder probarla sola.
 */

// #region Tipos
export interface FilaResumenMonto {
	clave: string;
	concepto: string;
	nivel: string;
	antes: string;
	ahora: string;
}

export interface ResumenMontos {
	titulo: string;
	filas: FilaResumenMonto[];
	avisos: string[];
}

export interface RevisionMontos {
	payload: GuardarMontosAnioPayload;
	resumen: ResumenMontos;
	tituloRevision: string;
	etiquetaGuardar: string;
	cantidad: number;
}

/** El borrador tras releer, sin lo escrito para conceptos que ya no vienen, y los nombres de esos conceptos. */
export interface BorradorReleido {
	borrador: BorradorMontos;
	descartados: string[];
}
// #endregion

// #region Textos
export const TEXTOS_MONTOS = {
	yaGuardados: 'Los montos que escribiste ya están guardados.',
	releidos: 'Se volvieron a leer los montos: revisa tus cambios y vuelve a guardar.',
	sinConfirmar:
		'No se pudo confirmar qué quedó guardado. Usa «Volver a leer» antes de guardar de nuevo.',
} as const;

const AVISO_COPIA =
	'Cada cargo copia el monto vigente al generarse: los cargos ya generados conservan su monto y estos valen para los que se generen desde ahora.';
const AVISO_NUEVO =
	'Un monto nuevo no se puede quitar después desde esta pantalla, solo cambiar su valor.';
const AVISO_PRIORIDAD =
	'El monto de un nivel tiene prioridad sobre «Todos los niveles» para ese nivel.';

/** «1 monto» / «N montos». */
export const cantidadMontos = (n: number): string => (n === 1 ? '1 monto' : `${n} montos`);

export function mensajeGuardadoMontos(n: number): string {
	if (n === 1) {
		return 'Se guardó 1 monto. Los cargos ya generados conservan su monto; los que se generen desde ahora usan este.';
	}
	return `Se guardaron ${n} montos. Los cargos ya generados conservan su monto; los que se generen desde ahora usan estos.`;
}

/** Lo escrito para un concepto desactivado no se guardó ni tiene dónde mostrarse: se dice, con su nombre. */
export function mensajeMontosDescartados(conceptos: readonly string[]): string {
	return `Se descartaron los montos que escribiste para ${listaLegible(conceptos)}.`;
}
// #endregion

// #region Resumen y revisión
const enSoles = (centavos: number): string => formatSoles(centavos / 100);

/** La pensión se muestra por cuota y el valor nuevo también por año: el error típico es escribir el total anual. */
function filaResumen(c: CambioMonto): FilaResumenMonto {
	const porCuota = c.codigo === 'PENSION';
	const sufijo = porCuota ? ' por cuota' : '';
	const anual = porCuota ? ` (${enSoles(c.ahoraCentavos * CUOTAS_PENSION)} al año)` : '';
	return {
		clave: c.clave,
		concepto: c.concepto,
		nivel: c.nivelEtiqueta,
		antes: c.antesCentavos === null ? '— (nuevo)' : `${enSoles(c.antesCentavos)}${sufijo}`,
		ahora: `${enSoles(c.ahoraCentavos)}${sufijo}${anual}`,
	};
}

/** «3 montos: 2 nuevos y 1 cambio», la fila de cada cambio y los avisos que aplican. */
export function resumenMontos(cambios: readonly CambioMonto[]): ResumenMontos {
	const nuevos = cambios.filter((c) => c.antesCentavos === null);
	const editados = cambios.length - nuevos.length;
	const partes: string[] = [];
	if (nuevos.length > 0) partes.push(nuevos.length === 1 ? '1 nuevo' : `${nuevos.length} nuevos`);
	if (editados > 0) partes.push(editados === 1 ? '1 cambio' : `${editados} cambios`);
	const avisos = [AVISO_COPIA];
	if (nuevos.length > 0) avisos.push(AVISO_NUEVO);
	if (nuevos.some((c) => c.nivel !== null)) avisos.push(AVISO_PRIORIDAD);
	return {
		titulo: `${cantidadMontos(cambios.length)}: ${listaLegible(partes)}`,
		filas: cambios.map((c) => filaResumen(c)),
		avisos,
	};
}

/** Congela lo que se va a enviar: la revisión reemplaza al editor y guardar envía exactamente este payload. */
export function armarRevisionMontos(anio: number, cambios: readonly CambioMonto[]): RevisionMontos {
	return {
		payload: armarPayloadMontos(anio, cambios),
		resumen: resumenMontos(cambios),
		tituloRevision: `Revisa los montos de ${anio} antes de guardar`,
		etiquetaGuardar: `Guardar ${cantidadMontos(cambios.length)}`,
		cantidad: cambios.length,
	};
}
// #endregion

// #region Después de releer
/**
 * El GET trae solo los conceptos activos: lo escrito para uno que se desactivó ya no tiene celda ni puede guardarse
 * (`PAGO_MONTO_CONCEPTO_INVALIDO`). Se quita del borrador y se devuelve su nombre para decirlo.
 */
export function borradorSobreConceptos(
	borrador: BorradorMontos,
	anteriores: readonly ConceptoConMontos[],
	vigentes: readonly ConceptoConMontos[],
): BorradorReleido {
	const siguen = new Set(vigentes.map((c) => c.conceptoId));
	const clavesDe = (c: ConceptoConMontos): ClaveMonto[] =>
		NIVELES_MONTO.map((o) => claveMonto(c.conceptoId, o.nivel));
	const idos = anteriores.filter(
		(c) => !siguen.has(c.conceptoId) && clavesDe(c).some((k) => k in borrador),
	);
	if (idos.length === 0) return { borrador, descartados: [] };
	const quitar = new Set(idos.flatMap(clavesDe));
	const resto = Object.fromEntries(
		Object.entries(borrador).filter(([clave]) => !quitar.has(clave)),
	);
	return { borrador: resto, descartados: idos.map((c) => nombreConcepto(c)) };
}

/**
 * ¿La relectura confirma que lo escrito ya estaba guardado? Solo si había algo escrito antes de releer, ya no quedan
 * diferencias y nada se descartó: sin nada escrito (por ejemplo, «Volver a leer» después de descartar) no hay qué
 * confirmar. Nunca tras `PAGO_MONTO_CONCEPTO_INVALIDO`: ese PUT se rechazó entero, así que no se guardó nada.
 */
export function relecturaConfirmaGuardado(
	err: ErrorHttpLike | null,
	habiaCambios: boolean,
	quedanCambios: boolean,
	descartados: readonly string[],
): boolean {
	return (
		habiaCambios &&
		!quedanCambios &&
		descartados.length === 0 &&
		err?.error?.errorCode !== 'PAGO_MONTO_CONCEPTO_INVALIDO'
	);
}

/**
 * Tras releer con lo escrito conservado. Con un error de guardado, su mensaje: después del GET ya describe el estado
 * real (el PUT es todo o nada). Sin error, la relectura la pidió la persona con «Volver a leer»: si había escrito algo
 * se le pide revisarlo; si no, no hay nada que decir.
 */
export function mensajeTrasRelectura(
	err: ErrorHttpLike | null,
	habiaCambios: boolean,
	descartados: readonly string[],
): MensajeSeccion | null {
	if (!err && !habiaCambios) return null;
	const base = err ? mensajeDeError(err, 'guardar-montos') : TEXTOS_MONTOS.releidos;
	const texto =
		descartados.length > 0 ? `${base} ${mensajeMontosDescartados(descartados)}` : base;
	return { severidad: err ? 'danger' : 'info', texto };
}
// #endregion
