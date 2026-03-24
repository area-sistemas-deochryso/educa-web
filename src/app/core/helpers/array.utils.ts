/**
 * Agrupa un array por una clave extraída de cada elemento.
 * Retorna un Map<K, T[]> con los elementos agrupados.
 *
 * @example
 * groupBy(vistas, v => getModulo(v.ruta))
 * // Map { 'admin' => [vista1, vista2], 'reportes' => [vista3] }
 */
export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
	const map = new Map<K, T[]>();
	for (const item of items) {
		const key = keyFn(item);
		const list = map.get(key) ?? [];
		list.push(item);
		map.set(key, list);
	}
	return map;
}

/**
 * Convierte un Map a un array de entries ordenado por clave (string).
 * Útil para groupBy + sort + map pattern.
 *
 * @example
 * const grouped = groupBy(items, i => i.category);
 * const sorted = sortedEntries(grouped);
 * // [['admin', [...]], ['reportes', [...]]]
 */
export function sortedEntries<T>(map: Map<string, T[]>): [string, T[]][] {
	return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}
