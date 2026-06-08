// #region Imports
import { isDevMode } from '@angular/core';
// #endregion

// #region Normalization

/**
 * Normalize a string for case-insensitive lookup across BD/FE boundaries.
 * Trims whitespace and uppercases to match BD convention.
 */
export function normalizeForLookup(value: string): string {
	return value.toUpperCase().trim();
}

// #endregion
// #region Safe lookup

/**
 * Case-insensitive lookup for values crossing BD<>FE boundaries.
 * Logs unmapped values to console.warn in dev mode.
 *
 * @param map Normalized map (keys must be uppercase via `buildNormalizedMap`).
 * @param key Raw key from BD or FE — will be normalized before lookup.
 * @param context Optional label for the warning (e.g. 'SHEET_TO_GRADO').
 * @returns The mapped value, or undefined if not found.
 */
export function safeLookup<V>(
	map: ReadonlyMap<string, V>,
	key: string,
	context?: string,
): V | undefined {
	const normalized = normalizeForLookup(key);
	const result = map.get(normalized);

	if (result === undefined && isDevMode()) {
		console.warn(
			`[safeLookup] Unmapped value: "${key}" (normalized: "${normalized}")` +
				(context ? ` in ${context}` : '') +
				`. Available keys: [${[...map.keys()].join(', ')}]`,
		);
	}

	return result;
}

/**
 * Build a Map with normalized (uppercase, trimmed) keys.
 * Use together with `safeLookup` for BD<>FE boundary lookups.
 */
export function buildNormalizedMap<V>(entries: [string, V][]): ReadonlyMap<string, V> {
	return new Map(entries.map(([k, v]) => [normalizeForLookup(k), v]));
}

// #endregion
// #region Guarded filter

/**
 * Filter an array and warn in dev mode when all items are filtered out
 * from a non-empty source — a common symptom of silent lookup mismatches.
 *
 * @param source The array to filter.
 * @param predicate The filter predicate.
 * @param context Optional label for the warning.
 * @returns The filtered array (same reference semantics as Array.filter).
 */
export function guardedFilter<T>(
	source: T[],
	predicate: (item: T) => boolean,
	context?: string,
): T[] {
	const result = source.filter(predicate);

	if (result.length === 0 && source.length > 0 && isDevMode()) {
		console.warn(
			`[guardedFilter] Filtered ${source.length} items to 0` +
				(context ? ` in ${context}` : '') +
				`. First 3 source items: ${JSON.stringify(source.slice(0, 3))}`,
		);
	}

	return result;
}

// #endregion
