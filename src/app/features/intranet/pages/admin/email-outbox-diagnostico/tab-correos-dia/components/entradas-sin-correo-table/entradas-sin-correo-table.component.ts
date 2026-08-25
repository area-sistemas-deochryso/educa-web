import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
	DiagnosticoRazon,
	EntradaSinCorreoEnviado,
} from '../../models/correos-dia.models';
import { RazonLabelPipe } from '../../pipes/razon-label.pipe';
import { EduTable, EduTag } from '@edu-ui';

type Severity = 'secondary' | 'warn' | 'danger';

const RAZON_SEVERITY: Record<DiagnosticoRazon, Severity> = {
	SIN_CORREO: 'warn',
	BLACKLISTED: 'danger',
	FALLIDO: 'danger',
	PENDIENTE: 'warn',
	SIN_RASTRO: 'danger',
};

@Component({
	selector: 'app-entradas-sin-correo-table',
	standalone: true,
	imports: [EduTable, EduTag, DatePipe, RazonLabelPipe],
	templateUrl: './entradas-sin-correo-table.component.html',
	styleUrl: './entradas-sin-correo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntradasSinCorreoTableComponent {
	readonly data = input.required<EntradaSinCorreoEnviado[]>();

	razonSeverity(razon: DiagnosticoRazon): Severity {
		return RAZON_SEVERITY[razon] ?? 'secondary';
	}

	isCritical(razon: DiagnosticoRazon): boolean {
		return razon === 'BLACKLISTED' || razon === 'FALLIDO' || razon === 'SIN_RASTRO';
	}
}
