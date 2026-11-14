import { normalizeSearchText, splitSearchWords } from './faq-search';

export interface HighlightSegment {
	text: string;
	match: boolean;
}

/**
 * Parte `text` en segmentos para resaltar cada palabra de `term` (sin distinguir mayúsculas ni tildes).
 * Se busca sobre el texto normalizado y los índices se mapean al original: `NFD` puede cambiar la longitud.
 */
export function highlightSegments(text: string, term: string): HighlightSegment[] {
	const words = splitSearchWords(term);
	if (words.length === 0) return [{ text, match: false }];

	// Cada carácter original aporta 0..n caracteres normalizados; `origin[i]` = rango original del i-ésimo.
	let normalized = '';
	const origin: [number, number][] = [];
	let position = 0;
	for (const char of text) {
		const piece = normalizeSearchText(char);
		origin.push(...Array.from({ length: piece.length }, (): [number, number] => [position, position + char.length]));
		normalized += piece;
		position += char.length;
	}

	const marked: [number, number][] = [];
	for (const word of words) {
		let index = normalized.indexOf(word);
		while (index !== -1) {
			marked.push([origin[index][0], origin[index + word.length - 1][1]]);
			index = normalized.indexOf(word, index + word.length);
		}
	}
	if (marked.length === 0) return [{ text, match: false }];

	marked.sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const range of marked) {
		const last = merged[merged.length - 1];
		if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
		else merged.push([...range]);
	}

	const segments: HighlightSegment[] = [];
	let cursor = 0;
	for (const [start, end] of merged) {
		if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
		segments.push({ text: text.slice(start, end), match: true });
		cursor = end;
	}
	if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
	return segments;
}
