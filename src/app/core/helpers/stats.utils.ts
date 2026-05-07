/**
 * Resultado de un toggle de estado para actualización de estadísticas.
 * `activosDelta` y `inactivosDelta` se aplican con `incrementarEstadistica()`.
 */
export interface EstadoToggleDeltas {
	activosDelta: number;
	inactivosDelta: number;
}

/**
 * Operaciones que afectan estado/contadores.
 * - 'toggle'   : invertir estado (activo↔inactivo). Total no cambia.
 * - 'delete'   : alias de 'delete-hard' (compat). HARD: registro físicamente removido.
 * - 'delete-soft': baja lógica (`_Estado=false`). El registro persiste como inactivo. Total no cambia.
 * - 'delete-hard': baja física. El registro desaparece. Total disminuye.
 */
export type EstadoStatsOperation = 'toggle' | 'delete' | 'delete-soft' | 'delete-hard';

/**
 * Calcula los deltas de estadísticas al cambiar estado.
 *
 * @param esActivo - ¿Está activo ANTES de la operación? Acepta boolean o truthy (1/0).
 * @param operation - Tipo de operación. Default `'toggle'`. Para deletes, distinguir
 *                    entre `'delete-soft'` (baja lógica) y `'delete-hard'` (baja física).
 *                    `'delete'` se mantiene como alias de `'delete-hard'` por compat.
 *
 * @example
 * // Toggle (boolean)
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(curso.estado);
 *
 * // Soft-delete (default en walDelete: BE hace `_Estado=false`)
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete-soft');
 *
 * // Hard-delete (BE hace DELETE físico, ej. Vistas)
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete-hard');
 */
export function getEstadoToggleDeltas(
	esActivo: boolean,
	operation: EstadoStatsOperation = 'toggle',
): EstadoToggleDeltas {
	if (operation === 'delete-soft') {
		// Soft-delete: registro pasa a inactivo. Equivalente a un toggle activo→inactivo.
		// Si ya era inactivo (re-soft-delete), no debería cambiar nada (defensivo).
		return {
			activosDelta: esActivo ? -1 : 0,
			inactivosDelta: esActivo ? 1 : 0,
		};
	}

	if (operation === 'delete' || operation === 'delete-hard') {
		// Hard-delete: el registro desaparece físicamente.
		// Si era activo: activos -1. Si era inactivo: inactivos -1.
		return {
			activosDelta: esActivo ? -1 : 0,
			inactivosDelta: esActivo ? 0 : -1,
		};
	}

	// toggle: invertir
	return {
		activosDelta: esActivo ? -1 : 1,
		inactivosDelta: esActivo ? 1 : -1,
	};
}

/**
 * Calcula los deltas de rollback (inverso de getEstadoToggleDeltas).
 * Útil para operaciones optimísticas con WAL.
 */
export function getEstadoRollbackDeltas(
	esActivo: boolean,
	operation: EstadoStatsOperation = 'toggle',
): EstadoToggleDeltas {
	const deltas = getEstadoToggleDeltas(esActivo, operation);
	// `0 - x` (en lugar de `-x`) normaliza a `+0` cuando x === 0 (evita `-0`).
	return {
		activosDelta: 0 - deltas.activosDelta,
		inactivosDelta: 0 - deltas.inactivosDelta,
	};
}
