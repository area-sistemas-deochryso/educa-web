import { Pipe, PipeTransform } from '@angular/core';

import { DiagnosticoRazon } from '../models/correos-dia.models';

const LABELS: Record<DiagnosticoRazon, string> = {
	SIN_CORREO: 'Sin correo apoderado',
	BLACKLISTED: 'Apoderado blacklisteado',
	FALLIDO: 'Envío fallido',
	PENDIENTE: 'Aún pendiente',
	SIN_RASTRO: 'Sin rastro en outbox',
};

@Pipe({ name: 'razonLabel', standalone: true, pure: true })
export class RazonLabelPipe implements PipeTransform {
	transform(value: DiagnosticoRazon | string): string {
		return LABELS[value as DiagnosticoRazon] ?? value;
	}
}
