/**
 * Generate a default password from last name and DNI.
 *
 * Format: first 2 letters of the last name (uppercase) + last 4 digits of DNI.
 *
 * @param apellidos Last names string.
 * @param dni DNI string.
 * @returns Generated password or empty string when inputs are insufficient.
 * @example
 * generatePassword('Garcia Lopez', '72345678');
 */
export function generatePassword(apellidos: string, dni: string): string {
	const apellido = apellidos.trim();
	const dniRaw = dni.trim();

	// First 2 letters of the last name in uppercase.
	const pref = apellido.slice(0, 2).toUpperCase();

	// Keep digits only and take the last 4.
	const digits = dniRaw.replace(/\D/g, '');
	const suf = digits.slice(-4);

	if (pref.length < 2 || suf.length < 4) return '';

	return `${pref}${suf}`;
}
