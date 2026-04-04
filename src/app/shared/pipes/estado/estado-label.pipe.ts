import { Pipe, PipeTransform } from '@angular/core';
import { getEstadoLabel } from '@core/helpers';

@Pipe({ name: 'estadoLabel', standalone: true, pure: true })
export class EstadoLabelPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoLabel(!!estado);
	}
}
