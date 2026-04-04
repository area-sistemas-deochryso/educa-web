import { Pipe, PipeTransform } from '@angular/core';
import { getEstadoToggleLabel } from '@core/helpers';

@Pipe({ name: 'estadoToggleLabel', standalone: true, pure: true })
export class EstadoToggleLabelPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoToggleLabel(!!estado);
	}
}
