import { Pipe, PipeTransform } from '@angular/core';
import { getEstadoToggleIcon } from '@core/helpers';

@Pipe({ name: 'estadoToggleIcon', standalone: true, pure: true })
export class EstadoToggleIconPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoToggleIcon(!!estado);
	}
}
