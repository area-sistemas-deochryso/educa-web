import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';

/** Tope de palabras distintas por búsqueda (igual que el `q` del servidor). */
export const MAX_SEARCH_WORDS = 8;

/** Minúsculas y sin marcas diacríticas (tildes, diéresis). */
export function normalizeSearchText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase();
}

/** Parte lo escrito en palabras normalizadas, distintas y hasta `MAX_SEARCH_WORDS`. */
export function splitSearchWords(term: string): string[] {
	const words = normalizeSearchText(term).split(/\s+/).filter(Boolean);
	return [...new Set(words)].slice(0, MAX_SEARCH_WORDS);
}

/** Todos los textos donde puede aparecer una palabra: pregunta, respuesta, palabras clave y pasos de la guía. */
function searchableText(faq: FaqDto): string {
	const parts = [faq.pregunta, faq.respuesta, faq.palabrasClave ?? ''];
	for (const paso of faq.wizard?.pasos ?? []) parts.push(paso.titulo ?? '', paso.texto);
	return normalizeSearchText(parts.join('\n'));
}

/** La pregunta coincide si **todas** las palabras aparecen en alguno de sus textos. Sin palabras, coincide. */
export function faqMatchesWords(faq: FaqDto, words: string[]): boolean {
	if (words.length === 0) return true;
	const haystack = searchableText(faq);
	return words.every((word) => haystack.includes(word));
}
