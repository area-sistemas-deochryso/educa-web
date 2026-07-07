import { Pipe, PipeTransform } from '@angular/core';
import { esSeccionDeVerano } from '@shared/models';

/**
 * Transforma el nombre de sección para display.
 * Sección "V" → "Verano", el resto se muestra en mayúsculas.
 *
 * @example
 * {{ salon.seccion | seccionLabel }}
 * <!-- "V" → "Verano", "A" → "A", "b" → "B" -->
 */
@Pipe({ name: 'seccionLabel', standalone: true, pure: true })
export class SeccionLabelPipe implements PipeTransform {
	transform(seccion: string): string {
		return esSeccionDeVerano(seccion) ? 'Verano' : seccion.toUpperCase();
	}
}
