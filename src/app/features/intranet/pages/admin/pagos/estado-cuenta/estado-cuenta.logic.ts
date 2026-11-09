// #region Imports
import type { CargoEstado, CuentaCargo, CuentaPago, PagosCategoria } from '@data/models';
import type { EduTagSeverity } from '@edu-ui';
import { formatFechaConDia, formatSoles } from '../utils/pagos-format.util';
// #endregion

/**
 * Lógica pura del estado de cuenta: etiquetas, celdas y orden en cliente.
 * Sin Angular para poder probarla sola.
 */

// #region Etiquetas
export interface EtiquetaView {
	label: string;
	severity: EduTagSeverity;
}

export const CATEGORIAS: Record<PagosCategoria, EtiquetaView> = {
	AlDia: { label: 'Al día', severity: 'success' },
	PagoParcial: { label: 'Pago parcial', severity: 'warn' },
	ConDeuda: { label: 'Con deuda', severity: 'danger' },
};

export const ESTADOS_CARGO: Record<CargoEstado, string> = {
	Pagado: 'Pagado',
	Vencida: 'Vencida',
	EnPlazo: 'En plazo',
	Pendiente: 'Pendiente',
	SinDato: 'Sin dato',
};
// #endregion

// #region Celdas
const SIN_VALOR = '—';

/** Un cargo «sin dato» nunca muestra saldo ni recargo (INV-PG14): se muestra «—», no «S/ 0.00». */
export const esSinDato = (cargo: Pick<CuentaCargo, 'estado'>): boolean => cargo.estado === 'SinDato';

export function saldoDe(cargo: CuentaCargo): string {
	return esSinDato(cargo) ? SIN_VALOR : formatSoles(cargo.saldo);
}

export function recargoDe(cargo: CuentaCargo): string {
	return esSinDato(cargo) ? SIN_VALOR : formatSoles(cargo.recargo);
}

export function fechaOVacio(iso: string | null): string {
	return iso ? formatFechaConDia(iso) : SIN_VALOR;
}

/** `HH:mm:ss` del servidor a `HH:mm`. */
export function horaCorta(hora: string | null): string {
	return hora ? hora.slice(0, 5) : '';
}

export function fechaPagoDe(pago: CuentaPago): string {
	const hora = horaCorta(pago.horaPago);
	return hora ? `${formatFechaConDia(pago.fechaPago)} ${hora}` : formatFechaConDia(pago.fechaPago);
}

/** Cuánto de un pago de familia es de este alumno; si es todo, no hace falta aclararlo. */
export function montoPagoDe(pago: CuentaPago): string {
	const total = formatSoles(pago.monto);
	return pago.montoAplicadoAlumno === pago.monto ? total : `${total} (de este alumno: ${formatSoles(pago.montoAplicadoAlumno)})`;
}

/** Para un registro anulado: «Anulado por <usuario> el <fecha>: <motivo>». */
export function detalleAnulacion(r: {
	vigente: boolean;
	motivoAnulacion: string | null;
	usuarioAnulacion: string | null;
	fechaAnulacion: string | null;
}): string {
	if (r.vigente) return '';
	const quien = r.usuarioAnulacion ? ` por ${r.usuarioAnulacion}` : '';
	const cuando = r.fechaAnulacion ? ` el ${formatFechaConDia(r.fechaAnulacion)}` : '';
	const motivo = r.motivoAnulacion ? `: ${r.motivoAnulacion}` : '';
	return `Anulado${quien}${cuando}${motivo}`;
}
// #endregion

// #region Orden en cliente
export type Orden = { key: string; descendente: boolean } | null;

/** Alterna asc → desc → sin orden, igual que «¿Quiénes deben?» (ahí lo ordena el servidor). */
export function siguienteOrden(actual: Orden, key: string): Orden {
	if (actual?.key !== key) return { key, descendente: false };
	return actual.descendente ? null : { key, descendente: true };
}

type Valor = string | number | null;

/** Ordena una copia: `null` va siempre al final, en cualquier sentido. Sin orden, respeta el del servidor. */
export function ordenar<T>(filas: readonly T[], orden: Orden, valorDe: (fila: T, key: string) => Valor): T[] {
	if (!orden) return [...filas];
	const signo = orden.descendente ? -1 : 1;
	return [...filas].sort((a, b) => {
		const va = valorDe(a, orden.key);
		const vb = valorDe(b, orden.key);
		if (va === null && vb === null) return 0;
		if (va === null) return 1;
		if (vb === null) return -1;
		if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signo;
		return String(va).localeCompare(String(vb), 'es') * signo;
	});
}
// #endregion
