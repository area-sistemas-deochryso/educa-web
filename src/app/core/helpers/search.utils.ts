// #region Search Utilities

/**
 * Compara si el texto contiene el término de búsqueda (case-insensitive).
 *
 * @example
 * searchMatch('Juan Pérez', 'juan')  // true
 * searchMatch(null, 'test')          // false
 * searchMatch('Hola', '')            // true (vacío matchea todo)
 */
export function searchMatch(text: string | null | undefined, term: string): boolean {
	if (!text) return false;
	if (!term) return true;
	return text.toLowerCase().includes(term.toLowerCase());
}

/**
 * Compara si alguno de los textos contiene el término (case-insensitive).
 *
 * @example
 * searchMatchAny(['Juan Pérez', 'DNI: 12345'], 'juan')  // true
 * searchMatchAny(['Evento A', 'Descripción B'], 'desc') // true
 */
export function searchMatchAny(texts: (string | null | undefined)[], term: string): boolean {
	if (!term) return true;
	const lower = term.toLowerCase();
	return texts.some((t) => t?.toLowerCase().includes(lower));
}
// #endregion
