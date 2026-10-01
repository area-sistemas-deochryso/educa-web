/**
 * Capitaliza la primera letra de un string.
 * @example capitalize('admin') → 'Admin'
 */
export function capitalize(s: string): string {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Obtiene la inicial en mayúscula de un string.
 * @example getInitial('asunto') → 'A'
 */
export function getInitial(s: string): string {
	if (!s) return '';
	return s.charAt(0).toUpperCase();
}

/**
 * Iniciales para avatares desde un nombre completo en formato "Apellido1 Apellido2 Nombre1 …":
 * primer apellido + primer nombre. Con 2 palabras usa ambas; con 1 usa solo esa.
 * @example getPersonInitials('Perez Gomez Juan Carlos') → 'PJ'
 */
export function getPersonInitials(fullName: string | null | undefined): string {
	const parts = (fullName ?? '').split(' ').filter((p) => p.length > 0);
	if (parts.length === 0) return '';
	const second = parts.length >= 3 ? parts[2] : parts[1];
	return `${parts[0][0]}${second?.[0] ?? ''}`.toUpperCase();
}

/**
 * Iniciales cuando apellido y nombre vienen en campos separados (mismo criterio que `getPersonInitials`).
 * @example getInitialsFromParts('Perez Gomez', 'Juan') → 'PJ'
 */
export function getInitialsFromParts(apellidos: string | null | undefined, nombres: string | null | undefined): string {
	return `${getInitial(apellidos ?? '')}${getInitial(nombres ?? '')}`;
}
