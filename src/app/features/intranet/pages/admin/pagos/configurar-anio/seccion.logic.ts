// #region Imports
import type { ParametroAnio } from '@data/models';

import { type DatosParametros, isoLocal } from '../utils/carga-inicial.logic';
// #endregion

/**
 * Piezas comunes a las secciones de «Configurar año» (P123 F3) que no son mensajes de error: el estado de la
 * lectura, el mensaje de estado de cada sección, las listas en español y la comparación de los parámetros con lo
 * guardado. Sin Angular para poder probarla sola. Los mensajes por `errorCode` siguen en `utils/carga-inicial.logic.ts`.
 */

// #region Estado de una sección
/** Estado de la lectura de una sección de «Configurar año». */
export type EstadoCarga = 'cargando' | 'lista' | 'error';

/** Mensaje de estado de una sección; lo pinta un `edu-message` con esa severidad. */
export interface MensajeSeccion {
	severidad: 'success' | 'info' | 'warn' | 'danger';
	texto: string;
}

/** «A», «A y B», «A, B y C»; vacío si no hay nada. */
export function listaLegible(items: readonly string[]): string {
	if (items.length < 2) return items.join('');
	return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
// #endregion

// #region Parámetros del año
/** Céntimos enteros: compara montos sin el ruido de la coma flotante (`0.1 + 0.2` y `0.3` son lo mismo). */
const centavosONulo = (soles: number | null): number | null =>
	soles === null ? null : Math.round(soles * 100);

/**
 * ¿El formulario de parámetros difiere de lo guardado? Montos en céntimos y fecha como `YYYY-MM-DD`; sin fila
 * guardada (año con `404`) cuenta cualquier dato escrito. Lo usa el aviso de cambios sin guardar.
 */
export function parametrosCambiaron(d: DatosParametros, guardado: ParametroAnio | null): boolean {
	const fecha = d.fechaInicial ? isoLocal(d.fechaInicial) : null;
	if (!guardado) return d.pagoMinimoPartes !== null || d.montoRecargo !== null || fecha !== null;
	// El BE omite los nulos del JSON: una fecha inicial ausente llega `undefined`.
	const fechaGuardada = guardado.fechaInicial ? guardado.fechaInicial.slice(0, 10) : null;
	return (
		centavosONulo(d.pagoMinimoPartes) !== centavosONulo(guardado.pagoMinimoPartes) ||
		centavosONulo(d.montoRecargo) !== centavosONulo(guardado.montoRecargo) ||
		fecha !== fechaGuardada
	);
}
// #endregion
