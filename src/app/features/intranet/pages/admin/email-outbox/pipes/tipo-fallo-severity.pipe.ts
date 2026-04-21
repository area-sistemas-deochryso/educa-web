import { Pipe, PipeTransform } from '@angular/core';

export type TipoFalloSeverity = 'danger' | 'warn' | 'info';

@Pipe({
	name: 'tipoFalloSeverity',
	standalone: true,
})
export class TipoFalloSeverityPipe implements PipeTransform {
	transform(tipo: string | null | undefined): TipoFalloSeverity {
		if (!tipo) return 'info';
		switch (tipo) {
			case 'FAILED_INVALID_ADDRESS':
			case 'FAILED_NO_EMAIL':
			case 'FAILED_MAILBOX_FULL':
			case 'FAILED_REJECTED':
				return 'danger';
			case 'FAILED_UNKNOWN':
			case 'FAILED_TRANSIENT':
				return 'warn';
			case 'TRANSIENT':
				return 'info';
			default:
				return 'info';
		}
	}
}
