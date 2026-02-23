/**
 * Genera una contraseña automática a partir de apellido y DNI.
 * Formato: 2 primeras letras del primer apellido (mayúsculas) + últimos 4 dígitos del DNI.
 * @example generatePassword('García López', '72345678') → 'GA5678'
 * @returns La contraseña generada o cadena vacía si los datos son insuficientes.
 */
export function generatePassword(apellidos: string, dni: string): string {
	const apellido = apellidos.trim();
	const dniRaw = dni.trim();

	// 2 primeras letras del primer apellido en mayúsculas
	const pref = apellido.slice(0, 2).toUpperCase();

	// Solo dígitos del DNI y últimos 4
	const digits = dniRaw.replace(/\D/g, '');
	const suf = digits.slice(-4);

	if (pref.length < 2 || suf.length < 4) return '';

	return `${pref}${suf}`;
}
