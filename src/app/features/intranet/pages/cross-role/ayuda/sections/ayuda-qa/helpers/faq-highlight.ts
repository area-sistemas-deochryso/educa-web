export interface HighlightSegment {
	text: string;
	match: boolean;
}

/** Parte `text` en segmentos para resaltar cada coincidencia (sin distinguir mayúsculas) de `term`. */
export function highlightSegments(text: string, term: string): HighlightSegment[] {
	const needle = term.trim().toLowerCase();
	if (!needle) return [{ text, match: false }];

	const haystack = text.toLowerCase();
	const segments: HighlightSegment[] = [];
	let cursor = 0;
	let index = haystack.indexOf(needle, cursor);

	while (index !== -1) {
		if (index > cursor) segments.push({ text: text.slice(cursor, index), match: false });
		segments.push({ text: text.slice(index, index + needle.length), match: true });
		cursor = index + needle.length;
		index = haystack.indexOf(needle, cursor);
	}
	if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });

	return segments;
}
