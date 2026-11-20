// #region Implementation
export type PageDirection = 'forward' | 'back';

const segmentsOf = (path: string): string[] => path.split('/').filter(Boolean);

const isPrefix = (shorter: string[], longer: string[]): boolean =>
	shorter.length < longer.length && shorter.every((segment, i) => segment === longer[i]);

/**
 * Dirección de una navegación según la jerarquía del path: si el destino extiende al origen es avance
 * (hub → página, lista → detalle) y si el origen extiende al destino es retroceso. Entre hermanos o rutas sin
 * relación no hay dirección (`null`) y queda el crossfade. Recibe paths sin query params ni fragmento.
 */
export function pageDirection(fromPath: string, toPath: string): PageDirection | null {
	const from = segmentsOf(fromPath);
	const to = segmentsOf(toPath);
	if (isPrefix(from, to)) return 'forward';
	if (isPrefix(to, from)) return 'back';
	return null;
}
// #endregion
