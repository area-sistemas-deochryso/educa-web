import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
	EmailDiagnosticoPersonaAsociada,
	TipoPersona,
} from '../../models/correo-individual.models';
import { CampoCorreoLabelPipe } from '../../pipes/campo-correo-label.pipe';
import { TipoPersonaLabelPipe } from '../../pipes/tipo-persona-label.pipe';
import { EduTable, EduTag } from '@edu-ui';

type Severity = 'secondary' | 'info' | 'success';

const TIPO_SEVERITY: Record<TipoPersona, Severity> = {
	E: 'info',
	P: 'success',
	D: 'success',
	APO: 'secondary',
};

@Component({
	selector: 'app-correo-personas-table',
	standalone: true,
	imports: [EduTable, EduTag, CampoCorreoLabelPipe, TipoPersonaLabelPipe],
	templateUrl: './correo-personas-table.component.html',
	styleUrl: './correo-personas-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoPersonasTableComponent {
	readonly data = input.required<EmailDiagnosticoPersonaAsociada[]>();

	severity(tipo: TipoPersona): Severity {
		return TIPO_SEVERITY[tipo] ?? 'secondary';
	}
}
