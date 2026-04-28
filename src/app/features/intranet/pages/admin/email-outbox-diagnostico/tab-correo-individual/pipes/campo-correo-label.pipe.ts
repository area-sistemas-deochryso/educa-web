import { Pipe, PipeTransform } from '@angular/core';

// El BE devuelve el nombre crudo de la columna (EST_CorreoApoderado, APO_Correo, PRO_Correo)
// como discriminador del rol del correo. La UI muestra una etiqueta amigable.
const LABELS: Record<string, string> = {
	EST_CorreoApoderado: 'Correo de apoderado',
	APO_Correo: 'Correo del apoderado',
	PRO_Correo: 'Correo del profesor',
	DIR_Correo: 'Correo del director',
};

@Pipe({ name: 'campoCorreoLabel', standalone: true, pure: true })
export class CampoCorreoLabelPipe implements PipeTransform {
	transform(value: string | null | undefined): string {
		if (!value) return '';
		return LABELS[value] ?? value;
	}
}
