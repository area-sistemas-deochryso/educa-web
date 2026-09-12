const RANDOM_LOWER_ALPHABET = 'abcdefghjkmnpqrstuvwxyz'; // sin l/o: evita confusión visual con 1/0
const RANDOM_SPECIAL_ALPHABET = '!@#$%';

/**
 * Pick one random character from `alphabet` using a cryptographically
 * secure source of randomness (Web Crypto API).
 */
function secureRandomChar(alphabet: string): string {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	return alphabet[buffer[0] % alphabet.length];
}

/**
 * Generate a default password from last name and DNI, with an added
 * cryptographically random segment so the result is not 100% derivable
 * from public data (DNI/apellido).
 *
 * Format: first 2 letters of the last name (uppercase)
 *       + 3 random lowercase letters
 *       + last 4 digits of DNI
 *       + 1 random special character.
 * Length 10, satisfies: uppercase, lowercase, digit, special char, length >= 8.
 *
 * @param apellidos Last names string.
 * @param dni DNI string.
 * @returns Generated password or empty string when inputs are insufficient.
 * @example
 * generatePassword('Garcia Lopez', '72345678'); // e.g. "GAxqz2345#" — random segment varies each call
 */
export function generatePassword(apellidos: string, dni: string): string {
	const apellido = apellidos.trim();
	const dniRaw = dni.trim();

	const pref = apellido.slice(0, 2).toUpperCase();
	const digits = dniRaw.replace(/\D/g, '');
	const suf = digits.slice(-4);

	if (pref.length < 2 || suf.length < 4) return '';

	const randomLower = Array.from({ length: 3 }, () => secureRandomChar(RANDOM_LOWER_ALPHABET)).join('');
	const randomSpecial = secureRandomChar(RANDOM_SPECIAL_ALPHABET);

	return `${pref}${randomLower}${suf}${randomSpecial}`;
}
