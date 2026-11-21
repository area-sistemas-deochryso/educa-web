/**
 * Semana a mostrar: la primera abierta que siga visible (filtro de búsqueda incluido);
 * si no hay ninguna, la primera de la lista. Con lista vacía devuelve `null`.
 */
export function resolverSemanaActiva<T extends { id: number }>(
	semanas: readonly T[],
	abiertas: readonly number[],
): T | null {
	return semanas.find((s) => abiertas.includes(s.id)) ?? semanas[0] ?? null;
}
