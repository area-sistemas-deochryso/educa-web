import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea nombre completo en orden estándar: "Apellidos Nombres".
 *
 * Uso en template:
 *   {{ item.apellidos | fullName:item.nombres }}
 *
 * Uso en TypeScript:
 *   import { formatFullName } from '@shared/pipes/full-name/full-name.pipe';
 *   const nombre = formatFullName(apellidos, nombres);
 */
@Pipe({ name: 'fullName', standalone: true, pure: true })
export class FullNamePipe implements PipeTransform {
	transform(
		apellidos: string | null | undefined,
		nombres: string | null | undefined,
	): string {
		return formatFullName(apellidos, nombres);
	}
}

/** Formato estándar: "Apellidos Nombres". */
export function formatFullName(
	apellidos: string | null | undefined,
	nombres: string | null | undefined,
): string {
	const a = (apellidos ?? '').trim();
	const n = (nombres ?? '').trim();
	if (!a && !n) return '';
	if (!a) return n;
	if (!n) return a;
	return `${a} ${n}`;
}
