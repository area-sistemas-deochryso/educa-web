import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'tipoFalloLabel',
	standalone: true,
})
export class TipoFalloLabelPipe implements PipeTransform {
	transform(tipo: string | null | undefined): string {
		if (!tipo) return 'Sin clasificar';
		switch (tipo) {
			case 'FAILED_INVALID_ADDRESS':
				return 'Dirección inválida';
			case 'FAILED_NO_EMAIL':
				return 'Sin correo';
			case 'FAILED_MAILBOX_FULL':
				return 'Bandeja llena';
			case 'FAILED_REJECTED':
				return 'Rechazado por servidor';
			case 'FAILED_UNKNOWN':
				return 'Error desconocido';
			case 'FAILED_TRANSIENT':
				return 'Transitorio agotado';
			case 'TRANSIENT':
				return 'En reintento';
			default:
				return tipo;
		}
	}
}
