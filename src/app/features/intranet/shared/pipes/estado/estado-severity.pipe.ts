import { Pipe, PipeTransform } from '@angular/core';
import { getEstadoSeverity } from '@core/helpers';

@Pipe({ name: 'estadoSeverity', standalone: true, pure: true })
export class EstadoSeverityPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): 'success' | 'danger' {
		return getEstadoSeverity(!!estado);
	}
}
