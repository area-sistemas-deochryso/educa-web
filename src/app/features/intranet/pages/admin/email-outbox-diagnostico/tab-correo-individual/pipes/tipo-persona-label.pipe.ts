import { Pipe, PipeTransform } from '@angular/core';

import { TipoPersona } from '../models/correo-individual.models';

const LABELS: Record<TipoPersona, string> = {
	E: 'Estudiante',
	P: 'Profesor',
	D: 'Director',
	APO: 'Apoderado',
};

@Pipe({ name: 'tipoPersonaLabel', standalone: true, pure: true })
export class TipoPersonaLabelPipe implements PipeTransform {
	transform(value: TipoPersona | string): string {
		return LABELS[value as TipoPersona] ?? value;
	}
}
