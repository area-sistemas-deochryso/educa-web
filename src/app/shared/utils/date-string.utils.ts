// #region Implementation
const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * 'YYYY-MM-DD' (o un ISO que empiece así) → `Date` a medianoche local.
 * Vacío, nulo o con otro formato → null. Útil para pasarle a `edu-datepicker`, que trabaja con `Date`.
 */
export function ymdToDate(value: string | null | undefined): Date | null {
	const match = value ? YMD.exec(value) : null;
	if (!match) return null;

	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	// new Date desborda fechas imposibles (2026-02-31 → marzo): se rechazan.
	const isSameDay =
		date.getFullYear() === Number(match[1]) &&
		date.getMonth() === Number(match[2]) - 1 &&
		date.getDate() === Number(match[3]);
	return isSameDay ? date : null;
}

/** `Date` → 'YYYY-MM-DD' en hora local (sin desfase de zona horaria). Nulo o inválido → ''. */
export function dateToYmd(value: Date | null | undefined): string {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';

	const month = String(value.getMonth() + 1).padStart(2, '0');
	const day = String(value.getDate()).padStart(2, '0');
	return `${value.getFullYear()}-${month}-${day}`;
}
// #endregion
