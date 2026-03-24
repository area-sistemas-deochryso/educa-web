import { Pipe, PipeTransform } from '@angular/core';
import {
	getEstadoLabel,
	getEstadoSeverity,
	getEstadoToggleIcon,
	getEstadoToggleLabel,
} from '@core/helpers';

@Pipe({ name: 'estadoLabel', standalone: true, pure: true })
export class EstadoLabelPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoLabel(!!estado);
	}
}

@Pipe({ name: 'estadoSeverity', standalone: true, pure: true })
export class EstadoSeverityPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): 'success' | 'danger' {
		return getEstadoSeverity(!!estado);
	}
}

@Pipe({ name: 'estadoToggleIcon', standalone: true, pure: true })
export class EstadoToggleIconPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoToggleIcon(!!estado);
	}
}

@Pipe({ name: 'estadoToggleLabel', standalone: true, pure: true })
export class EstadoToggleLabelPipe implements PipeTransform {
	transform(estado: boolean | number | undefined | null): string {
		return getEstadoToggleLabel(!!estado);
	}
}
