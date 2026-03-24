/**
 * Resultado de un toggle de estado para actualización de estadísticas.
 * `activosDelta` y `inactivosDelta` se aplican con `incrementarEstadistica()`.
 */
export interface EstadoToggleDeltas {
	activosDelta: number;
	inactivosDelta: number;
}

/**
 * Calcula los deltas de estadísticas al cambiar estado.
 *
 * @param esActivo - ¿Está activo ANTES de la operación? Acepta boolean o truthy (1/0).
 * @param operation - 'toggle' (default) o 'delete'
 *
 * @example
 * // Toggle (boolean)
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(curso.estado);
 *
 * // Toggle (number 0/1, como Vistas)
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(vista.estado === 1);
 *
 * // Delete
 * const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete');
 */
export function getEstadoToggleDeltas(
	esActivo: boolean,
	operation: 'toggle' | 'delete' = 'toggle',
): EstadoToggleDeltas {
	if (operation === 'delete') {
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
	operation: 'toggle' | 'delete' = 'toggle',
): EstadoToggleDeltas {
	const deltas = getEstadoToggleDeltas(esActivo, operation);
	return {
		activosDelta: -deltas.activosDelta,
		inactivosDelta: -deltas.inactivosDelta,
	};
}
