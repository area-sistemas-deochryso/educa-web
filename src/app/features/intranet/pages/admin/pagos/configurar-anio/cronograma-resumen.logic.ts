// #region Imports
import type { GuardarCronogramaAnioPayload } from '@data/models';
import { type FilaCuota, armarPayloadCronograma, numerosLegibles } from './cronograma-anio.logic';
import { CUOTAS_POR_ANIO, diasEntre, fechaConDiaLargo } from './cronograma-fechas.logic';
// #endregion

/**
 * Resumen antes de guardar el cronograma (P123 F3, D6): reemplaza al editor y congela el payload, así lo que la
 * persona confirma es exactamente lo que viaja. Las fechas se leen en vivo en el BE: cambiar una mueve el vencimiento,
 * el recargo y la deuda de las cuotas ya generadas, y los avisos lo explican antes de guardar. Sin Angular.
 */

// #region Tipos
export interface FilaResumenCuota {
	numero: number;
	etiqueta: string;
	/** La etiqueta guardada, solo si cambia. */
	etiquetaAntes: string | null;
	antes: string | null;
	ahora: string;
	efecto: string | null;
}

export interface ResumenCronograma {
	creacion: boolean;
	/** Alguna cuota ya guardada cambia de fecha: mueve las cuotas de pensión ya generadas. */
	cambiaFechas: boolean;
	titulo: string;
	caption: string;
	filas: FilaResumenCuota[];
	textoSinCambio: string | null;
	avisos: string[];
}

export interface RevisionCronograma {
	payload: GuardarCronogramaAnioPayload;
	resumen: ResumenCronograma;
	tituloRevision: string;
	etiquetaGuardar: string;
	creacion: boolean;
}
// #endregion

// #region Textos
export const TEXTOS_CRONOGRAMA = {
	yaGuardado: 'El cronograma que escribiste ya está guardado.',
	releido: 'Se volvió a leer el cronograma: revisa tus cambios y vuelve a guardar.',
	sinConfirmar:
		'No se pudo confirmar qué quedó guardado. Usa «Volver a leer» antes de guardar de nuevo.',
} as const;

const AVISOS = {
	fechasMovidas:
		'Las cuotas de pensión ya generadas toman la fecha nueva: cambia su vencimiento, desde cuándo cobran recargo y quiénes figuran como deudores. El monto no cambia.',
	adelanta:
		'Adelantar un vencimiento puede dejar fuera de plazo un pago que llegó a tiempo con la fecha anterior: esa cuota pasaría a tener recargo.',
	atrasa: 'Atrasar un vencimiento quita el recargo de las cuotas impagas que todavía no lo tenían fijado.',
	etiquetas:
		'Las etiquetas nuevas se ven en el estado de cuenta, en «Quiénes deben» y al registrar pagos.',
} as const;

const cantidadDias = (n: number): string => (n === 1 ? '1 día' : `${n} días`);

/** «cuota 3» o «cuotas 3 y 4». */
const cuotasLegibles = (numeros: readonly number[]): string =>
	numeros.length === 1 ? `cuota ${numeros[0]}` : `cuotas ${numerosLegibles(numeros)}`;
// #endregion

// #region Resumen
/**
 * Al crear (ninguna cuota guardada) se listan las 10; al editar, solo las que difieren de lo guardado.
 * `hoy` (`YYYY-MM-DD`) decide los avisos de fechas pasadas y de año terminado.
 */
export function resumenCronograma(
	anio: number,
	filas: readonly FilaCuota[],
	hoy: string,
): ResumenCronograma {
	const creacion = filas.every((f) => f.guardada === null);
	const incluidas = creacion ? filas : filas.filter((f) => f.cambiada);
	const movidas = creacion
		? []
		: incluidas.filter((f) => f.guardada !== null && f.fecha !== f.baseFecha);
	return {
		creacion,
		cambiaFechas: movidas.length > 0,
		titulo: tituloResumen(anio, creacion, incluidas.length),
		caption: creacion ? 'Cuotas del cronograma' : 'Cambios en el cronograma',
		filas: incluidas.map((f) => filaResumen(f, creacion)),
		textoSinCambio: textoSinCambio(creacion, filas.length - incluidas.length),
		avisos: creacion ? [avisoCreacion(anio)] : avisosEdicion(anio, incluidas, movidas, hoy),
	};
}

function tituloResumen(anio: number, creacion: boolean, cambiadas: number): string {
	if (creacion) return `Se crean las ${CUOTAS_POR_ANIO} cuotas de ${anio}`;
	return cambiadas === 1 ? 'Cambia 1 cuota' : `Cambian ${cambiadas} cuotas`;
}

function filaResumen(f: FilaCuota, creacion: boolean): FilaResumenCuota {
	const etiqueta = f.etiqueta.trim();
	const guardada = f.guardada ? f.guardada.etiqueta.trim() : null;
	return {
		numero: f.numero,
		etiqueta,
		etiquetaAntes: guardada !== null && guardada !== etiqueta ? guardada : null,
		antes: f.guardada ? fechaConDiaLargo(f.baseFecha) : null,
		ahora: fechaConDiaLargo(f.fecha),
		efecto: creacion ? null : efecto(f),
	};
}

function efecto(f: FilaCuota): string {
	if (f.guardada === null) return 'Cuota nueva';
	const dias = diasEntre(f.baseFecha, f.fecha);
	if (dias < 0) return `Se adelanta ${cantidadDias(-dias)}`;
	if (dias > 0) return `Se atrasa ${cantidadDias(dias)}`;
	return 'Cambia la etiqueta';
}

function textoSinCambio(creacion: boolean, sinCambio: number): string | null {
	if (creacion || sinCambio === 0) return null;
	return sinCambio === 1
		? 'La otra cuota no cambia.'
		: `Las otras ${sinCambio} cuotas no cambian.`;
}

function avisoCreacion(anio: number): string {
	return `Las cuotas de pensión que generes para ${anio} vencerán en estas fechas. Puedes cambiarlas después, pero un cambio también mueve las cuotas ya generadas.`;
}

/**
 * `movidas`: cuotas ya guardadas que cambian de fecha. Solo esas mueven cuotas de pensión ya generadas; una cuota
 * nueva todavía no tiene cargos.
 */
function avisosEdicion(
	anio: number,
	incluidas: readonly FilaCuota[],
	movidas: readonly FilaCuota[],
	hoy: string,
): string[] {
	const avisos: string[] = [];
	if (movidas.length > 0) avisos.push(AVISOS.fechasMovidas);
	if (movidas.some((f) => f.fecha < f.baseFecha)) avisos.push(AVISOS.adelanta);
	if (movidas.some((f) => f.fecha > f.baseFecha)) avisos.push(AVISOS.atrasa);
	const pasadas = movidas
		.filter((f) => f.baseFecha <= hoy || f.fecha <= hoy)
		.map((f) => f.numero);
	if (pasadas.length > 0) {
		avisos.push(
			`Hay cambios en fechas que ya pasaron (${cuotasLegibles(pasadas)}): afectan las deudas y los recargos de hoy.`,
		);
	}
	const cambiaEtiquetas = incluidas.some(
		(f) => f.guardada !== null && f.etiqueta.trim() !== f.guardada.etiqueta.trim(),
	);
	if (movidas.length === 0 && cambiaEtiquetas) avisos.push(AVISOS.etiquetas);
	if (movidas.length > 0 && anio < Number(hoy.slice(0, 4))) {
		avisos.push(
			`${anio} ya terminó: los reportes de ese año pueden cambiar con las fechas nuevas.`,
		);
	}
	return avisos;
}
// #endregion

// #region Revisión y mensajes
export function armarRevisionCronograma(
	anio: number,
	filas: readonly FilaCuota[],
	hoy: string,
): RevisionCronograma {
	const resumen = resumenCronograma(anio, filas, hoy);
	return {
		payload: armarPayloadCronograma(anio, filas),
		resumen,
		tituloRevision: resumen.creacion
			? `Revisa el cronograma de ${anio} antes de guardar`
			: `Revisa los cambios del cronograma de ${anio}`,
		etiquetaGuardar: resumen.creacion
			? `Guardar las ${CUOTAS_POR_ANIO} cuotas`
			: 'Guardar cambios del cronograma',
		creacion: resumen.creacion,
	};
}

/** Solo promete que las cuotas generadas se mueven si de verdad cambió alguna fecha guardada. */
export function mensajeGuardadoCronograma(
	creacion: boolean,
	anio: number,
	cambiaFechas: boolean,
): string {
	if (creacion) return `Se guardó el cronograma de ${anio}: ${CUOTAS_POR_ANIO} cuotas.`;
	if (cambiaFechas) {
		return 'Se guardaron los cambios del cronograma. Las cuotas ya generadas toman las fechas nuevas.';
	}
	return 'Se guardaron los cambios del cronograma.';
}
// #endregion
