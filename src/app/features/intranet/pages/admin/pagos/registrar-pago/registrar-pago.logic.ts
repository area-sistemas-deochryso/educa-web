// #region Imports
import type { PagoMedio, RegistrarPagoPayload, RepartoAplicacion } from '@data/models';
// #endregion

/**
 * Lógica pura de «Registrar pago»: cuadre del reparto, mapeo de errores y clave de idempotencia.
 * Sin Angular para poder probarla sola.
 */

// #region Dinero
/** Todo el cuadre se hace en centavos enteros; nunca en punto flotante (contrato, «Hechos»). */
export const toCentavos = (soles: number): number => Math.round(soles * 100);

export const toSoles = (centavos: number): number => centavos / 100;

/** Suma de `montoBase + montoRecargo` de todas las aplicaciones, en centavos. */
export function totalCentavos(aplicaciones: readonly RepartoAplicacion[]): number {
	return aplicaciones.reduce((sum, a) => sum + toCentavos(a.montoBase) + toCentavos(a.montoRecargo), 0);
}

/** Cuánto falta (positivo) o sobra (negativo) para que el reparto iguale el monto del pago. */
export function diferenciaCentavos(monto: number, aplicaciones: readonly RepartoAplicacion[]): number {
	return toCentavos(monto) - totalCentavos(aplicaciones);
}

/** Verdadero si el reparto cuadra con el monto y ninguna aplicación queda en negativo. */
export function repartoCuadra(monto: number, aplicaciones: readonly RepartoAplicacion[]): boolean {
	if (aplicaciones.length === 0) return false;
	if (monto <= 0) return false;
	const algunaNegativa = aplicaciones.some((a) => a.montoBase < 0 || a.montoRecargo < 0);
	return !algunaNegativa && diferenciaCentavos(monto, aplicaciones) === 0;
}
// #endregion

// #region Payload
/** Arma el cuerpo de `POST /api/pagos` a partir del formulario. La hora se envía como `HH:mm:ss` (TimeSpan). */
export function armarPayload(datos: {
	monto: number;
	fechaPago: string;
	horaPago: string | null;
	medio: PagoMedio;
	bancoOrigen: string | null;
	numeroOperacion: string | null;
	comprobante: string;
	observaciones: string | null;
	aplicaciones: readonly RepartoAplicacion[];
}): RegistrarPagoPayload {
	return {
		monto: toSoles(toCentavos(datos.monto)),
		fechaPago: datos.fechaPago,
		horaPago: datos.horaPago ? `${datos.horaPago}:00` : null,
		medio: datos.medio,
		bancoOrigen: datos.bancoOrigen?.trim() || null,
		numeroOperacion: datos.numeroOperacion?.trim() || null,
		comprobante: datos.comprobante.trim(),
		observaciones: datos.observaciones?.trim() || null,
		aplicaciones: datos.aplicaciones.map((a) => ({
			cargoId: a.cargoId,
			montoBase: toSoles(toCentavos(a.montoBase)),
			montoRecargo: toSoles(toCentavos(a.montoRecargo)),
		})),
	};
}
// #endregion

// #region Errores
/** Mensaje en español por `errorCode` del BE. Nunca se muestra el texto crudo del servidor. */
const MENSAJES_POR_CODIGO: Readonly<Record<string, string>> = {
	PAGO_MONTO_INVALIDO: 'El monto debe ser mayor que cero y tener como máximo dos decimales.',
	PAGO_COMPROBANTE_REQUERIDO: 'El comprobante es obligatorio. Solo un pago en efectivo puede usar «S/N».',
	PAGO_FECHA_FUTURA: 'La fecha del pago no puede ser futura.',
	PAGO_MEDIO_INVALIDO: 'El medio de pago no es válido.',
	PAGO_OPERACION_DUPLICADA: 'Ya hay un pago activo con ese número de operación en el mismo banco.',
	PAGO_IDENTIFICACION_INCOMPLETA:
		'Faltan datos para identificar el pago: sin número de operación, indicá fecha, hora, monto y banco de origen.',
	PAGO_APLICACION_SIN_CARGOS: 'El reparto no tiene cargos a los que aplicar el pago.',
	PAGO_APLICACION_SUMA_INVALIDA: 'La suma del reparto debe ser igual al monto del pago.',
	PAGO_APLICACION_EXCEDE_SALDO: 'Un cargo recibe más de lo que le queda pendiente.',
	PAGO_CARGO_NO_APLICABLE: 'Un cargo no se puede pagar todavía: tiene datos sin confirmar.',
	PAGO_MINIMO_NO_ALCANZADO: 'El monto no alcanza el mínimo que exige la regla de pago.',
	PAGO_PARAMETRO_ANIO_INEXISTENTE: 'Falta la configuración del año de este pago. Pedila a administración.',
	PAGO_CLAVE_IDEMPOTENCIA_REQUERIDA: 'Falta la clave del intento. Volvé a enviar el formulario.',
};

const MENSAJE_CONFLICTO =
	'Otro pago se registró sobre el mismo cargo al mismo tiempo. Revisá el reparto y volvé a proponerlo.';

const MENSAJE_RED =
	'No hubo respuesta del servidor. Si reenviás, el pago no se duplica: se usa el mismo intento.';

const MENSAJE_GENERICO = 'No se pudo registrar el pago. Revisá los datos e intentá de nuevo.';

export interface ErrorHttpLike {
	status?: number;
	error?: { errorCode?: string } | null;
}

/** Traduce el error HTTP de `POST /api/pagos` a un mensaje de regla de negocio. */
export function mensajeDeError(err: ErrorHttpLike | null | undefined): string {
	if (!err) return MENSAJE_GENERICO;
	if (err.status === 0) return MENSAJE_RED;
	if (err.status === 409) return MENSAJE_CONFLICTO;
	const codigo = err.error?.errorCode;
	return (codigo && MENSAJES_POR_CODIGO[codigo]) || MENSAJE_GENERICO;
}
// #endregion

// #region Idempotencia
/**
 * Clave de idempotencia de un intento. El middleware del BE cachea también las respuestas de error
 * 24 h, así que reusar una clave tras cualquier respuesta devuelve ese mismo resultado.
 */
export interface IntentoPago {
	clave: string;
	huella: string;
}

/** Huella del payload sin la clave: si el formulario cambió, el intento es otro. */
export const huellaDe = (payload: RegistrarPagoPayload): string => JSON.stringify(payload);

/**
 * Devuelve la clave a enviar. Se reusa la del intento anterior solo si no hubo respuesta
 * (red o timeout) y el payload no cambió. En cualquier otro caso se genera una clave nueva.
 */
export function claveParaEnvio(
	previo: IntentoPago | null,
	huella: string,
	sinRespuesta: boolean,
	generarClave: () => string = () => crypto.randomUUID(),
): IntentoPago {
	if (previo && sinRespuesta && previo.huella === huella) return previo;
	return { clave: generarClave(), huella };
}
// #endregion
