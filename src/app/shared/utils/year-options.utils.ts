import { type SelectOption } from '@shared/models/select-option.models';

// #region Implementation
/**
 * Años para un selector: una ventana alrededor del año actual (por defecto 1 atrás y 2 adelante).
 * Si `selected` cae fuera de la ventana se agrega, para que el valor elegido siempre exista en la lista.
 */
export function buildYearOptions(
	selected?: number | null,
	options: { back?: number; ahead?: number; now?: number } = {},
): SelectOption<number>[] {
	const { back = 1, ahead = 2, now = new Date().getFullYear() } = options;
	const years = new Set<number>();

	for (let year = now - back; year <= now + ahead; year++) years.add(year);
	if (selected) years.add(selected);

	return [...years].sort((a, b) => a - b).map((year) => ({ label: String(year), value: year }));
}
// #endregion
