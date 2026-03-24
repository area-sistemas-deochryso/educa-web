/**
 * Tabla de decisión explícita para operaciones CRUD.
 *
 * Antes: la estrategia (refetch vs mutación quirúrgica) vivía
 * en la cabeza del desarrollador y en comentarios del facade.
 * Ahora: es un artefacto consultable que documenta y valida.
 *
 * Regla: "No recargar lo que puedes actualizar quirúrgicamente."
 */

// #region Types

export type CrudOperation = 'CREATE' | 'UPDATE' | 'TOGGLE' | 'DELETE';

export interface CrudStrategy {
	/** ¿Se hace refetch de la lista después de la operación? */
	readonly refetchItems: boolean;
	/** ¿Se hace mutación local del item afectado? */
	readonly localMutation: boolean;
	/** ¿Se actualizan estadísticas incrementalmente? */
	readonly incrementalStats: boolean;
	/** ¿Se cierra el diálogo optimísticamente? */
	readonly optimisticDialogClose: boolean;
	/** Razón de la estrategia elegida */
	readonly reason: string;
}

// #endregion

// #region Strategy Table

/**
 * Tabla de verdad: qué hacer después de cada operación CRUD.
 *
 * | Operación | Refetch | Mutación local | Stats incremental | Por qué                    |
 * |-----------|---------|----------------|-------------------|----------------------------|
 * | CREATE    | ✅ Sí   | ❌ No          | ✅ Sí             | Necesitamos ID del servidor |
 * | UPDATE    | ❌ No   | ✅ Sí          | ❌ No             | Ya tenemos ID y campos      |
 * | TOGGLE    | ❌ No   | ✅ Sí          | ✅ Sí             | Solo cambia 1 campo         |
 * | DELETE    | ❌ No   | ✅ Sí          | ✅ Sí             | Ya tenemos ID               |
 */
export const CRUD_STRATEGIES: Record<CrudOperation, CrudStrategy> = {
	CREATE: {
		refetchItems: true,
		localMutation: false,
		incrementalStats: true,
		optimisticDialogClose: true,
		reason: 'Necesitamos el ID generado por el servidor',
	},
	UPDATE: {
		refetchItems: false,
		localMutation: true,
		incrementalStats: false,
		optimisticDialogClose: true,
		reason: 'Ya tenemos ID y campos — mutación quirúrgica',
	},
	TOGGLE: {
		refetchItems: false,
		localMutation: true,
		incrementalStats: true,
		optimisticDialogClose: false,
		reason: 'Solo cambia estado boolean + ajustar contadores',
	},
	DELETE: {
		refetchItems: false,
		localMutation: true,
		incrementalStats: true,
		optimisticDialogClose: false,
		reason: 'Remover del array local + ajustar contadores',
	},
};

// #endregion

// #region Helpers

/**
 * Consulta la estrategia para una operación CRUD.
 *
 * @example
 * const strategy = getCrudStrategy('UPDATE');
 * if (strategy.localMutation) {
 *   this.store.updateItem(id, updates);
 * }
 * if (strategy.refetchItems) {
 *   this.refreshItemsOnly();
 * }
 */
export function getCrudStrategy(operation: CrudOperation): CrudStrategy {
	return CRUD_STRATEGIES[operation];
}

/**
 * Valida que un facade implementa la estrategia correcta.
 * Útil en tests o code review automatizado.
 */
export function shouldRefetchAfter(operation: CrudOperation): boolean {
	return CRUD_STRATEGIES[operation].refetchItems;
}

export function shouldMutateLocally(operation: CrudOperation): boolean {
	return CRUD_STRATEGIES[operation].localMutation;
}

export function shouldUpdateStats(operation: CrudOperation): boolean {
	return CRUD_STRATEGIES[operation].incrementalStats;
}

// #endregion
