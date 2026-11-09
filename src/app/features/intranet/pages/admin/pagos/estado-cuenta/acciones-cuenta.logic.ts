// #region Imports
import type { CuentaCargo, CuentaPago, RegistrarAjustePayload } from '@data/models';
import { formatSoles } from '../utils/pagos-format.util';
import { esSinDato } from './estado-cuenta.logic';
// #endregion

/**
 * Lógica pura de las acciones sobre la cuenta (anular pago, registrar y anular ajuste).
 * Sin Angular para poder probarla sola. El dinero se compara en centavos enteros.
 */

// #region Dinero
const toCentavos = (soles: number): number => Math.round(soles * 100);

/**
 * Cuánto admite un ajuste, a título orientativo: `montoBase − ajuste − pagadoBase`, igual que el saldo base del BE
 * (`CobranzaCalculator`). El BE decide; si el FE se equivoca, el rechazo `AJUSTE_EXCEDE_SALDO` se muestra igual.
 */
export function topeAjuste(cargo: Pick<CuentaCargo, 'montoBase' | 'ajuste' | 'pagadoBase'>): number {
	return Math.max(0, (toCentavos(cargo.montoBase) - toCentavos(cargo.ajuste) - toCentavos(cargo.pagadoBase)) / 100);
}

/** Un cargo «sin dato» no admite ajustes (INV-PG14) y uno pagado no tiene saldo base que ajustar. */
export function admiteAjuste(cargo: Pick<CuentaCargo, 'estado'>): boolean {
	return !esSinDato(cargo) && cargo.estado !== 'Pagado';
}
// #endregion

// #region Pago de familia
/** Un pago de familia cubrió más que lo de este alumno: anularlo libera también los cargos de los otros. */
export const esPagoDeFamilia = (pago: Pick<CuentaPago, 'monto' | 'montoAplicadoAlumno'>): boolean =>
	toCentavos(pago.monto) !== toCentavos(pago.montoAplicadoAlumno);

export function avisoAnularPago(pago: Pick<CuentaPago, 'monto' | 'montoAplicadoAlumno'>): string | null {
	if (!esPagoDeFamilia(pago)) return null;
	return `Este pago de ${formatSoles(pago.monto)} cubrió también a otros alumnos (de este alumno: ${formatSoles(pago.montoAplicadoAlumno)}). Al anularlo se liberan también los cargos de ellos.`;
}
// #endregion

// #region Payload
export interface DatosAjuste {
	cargoId: number;
	tipo: RegistrarAjustePayload['tipo'];
	monto: number;
	motivo: string;
}

/** Motivo obligatorio solo en descuentos (INV-PG08); en especie va solo si se escribió. */
export function ajusteValido(d: Pick<DatosAjuste, 'tipo' | 'monto' | 'motivo'>): boolean {
	if (toCentavos(d.monto) <= 0) return false;
	return d.tipo !== 'DESCUENTO' || d.motivo.trim().length > 0;
}

export function armarPayloadAjuste(d: DatosAjuste): RegistrarAjustePayload {
	return { cargoId: d.cargoId, tipo: d.tipo, monto: toCentavos(d.monto) / 100, motivo: d.motivo.trim() || null };
}
// #endregion

// #region Errores
export interface ErrorHttpLike {
	status?: number;
	error?: { errorCode?: string } | null;
}

export type AccionCuenta = 'anular-pago' | 'registrar-ajuste' | 'anular-ajuste';

/** Mensaje en español por `errorCode`. Nunca se muestra el texto crudo del servidor. */
const MENSAJES_POR_CODIGO: Readonly<Record<string, string>> = {
	PAGO_NO_ENCONTRADO: 'El pago ya no existe. Se recargó la cuenta.',
	PAGO_YA_ANULADO: 'El pago ya estaba anulado. Se recargó la cuenta.',
	PAGO_MOTIVO_ANULACION_REQUERIDO: 'Escribe el motivo de la anulación.',
	AJUSTE_TIPO_INVALIDO: 'El tipo de ajuste no es válido.',
	AJUSTE_MONTO_INVALIDO: 'El monto debe ser mayor que cero y tener como máximo dos decimales.',
	AJUSTE_MOTIVO_REQUERIDO: 'Un descuento requiere un motivo.',
	AJUSTE_EXCEDE_SALDO: 'El ajuste no puede superar lo que le queda por pagar al cargo (sin contar el recargo).',
	AJUSTE_NO_ENCONTRADO: 'El ajuste ya no existe. Se recargó la cuenta.',
	AJUSTE_YA_ANULADO: 'El ajuste ya estaba anulado. Se recargó la cuenta.',
	PAGO_CARGO_NO_APLICABLE: 'Un cargo sin dato confirmado no admite ajustes.',
};

const MENSAJE_COMPETENCIA = 'Otra persona modificó esta cuenta al mismo tiempo. Se recargó la cuenta: revísala y vuelve a intentarlo.';

const MENSAJE_RED: Readonly<Record<AccionCuenta, string>> = {
	'anular-pago': 'No hubo respuesta del servidor. Se recargó la cuenta: revisa si el pago quedó anulado antes de repetir.',
	'anular-ajuste': 'No hubo respuesta del servidor. Se recargó la cuenta: revisa si el ajuste quedó anulado antes de repetir.',
	'registrar-ajuste':
		'No hubo respuesta del servidor. Se recargó la cuenta: revisa la lista de ajustes antes de repetir, para no registrarlo dos veces.',
};

const MENSAJE_GENERICO: Readonly<Record<AccionCuenta, string>> = {
	'anular-pago': 'No se pudo anular el pago. Intenta de nuevo.',
	'anular-ajuste': 'No se pudo anular el ajuste. Intenta de nuevo.',
	'registrar-ajuste': 'No se pudo registrar el ajuste. Revisa los datos e intenta de nuevo.',
};

/** `409` de competencia (INV-S05): el BE lo responde con `CONCURRENCY_CONFLICT`, no con un código de pagos. */
const esCompetencia = (err: ErrorHttpLike): boolean => err.status === 409;

export function mensajeDeError(err: ErrorHttpLike | null | undefined, accion: AccionCuenta): string {
	if (!err) return MENSAJE_GENERICO[accion];
	if (err.status === 0) return MENSAJE_RED[accion];
	if (esCompetencia(err)) return MENSAJE_COMPETENCIA;
	const codigo = err.error?.errorCode;
	return (codigo && MENSAJES_POR_CODIGO[codigo]) || MENSAJE_GENERICO[accion];
}

/**
 * Tras estos errores la cuenta mostrada ya no es la real (o no se sabe), así que se recarga.
 * Un rechazo de validación (`400` con regla) no cambia la cuenta: se queda el diálogo con su mensaje, sin recargar.
 */
export function requiereRecarga(err: ErrorHttpLike | null | undefined): boolean {
	if (!err) return false;
	if (err.status === 0 || err.status === 404 || err.status === 409) return true;
	const codigo = err.error?.errorCode ?? '';
	return codigo.endsWith('_YA_ANULADO') || codigo.endsWith('_NO_ENCONTRADO');
}
// #endregion
