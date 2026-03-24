/**
 * Capitaliza la primera letra de un string.
 * @example capitalize('admin') → 'Admin'
 */
export function capitalize(s: string): string {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Obtiene la inicial en mayúscula de un string.
 * @example getInitial('asunto') → 'A'
 */
export function getInitial(s: string): string {
	if (!s) return '';
	return s.charAt(0).toUpperCase();
}
