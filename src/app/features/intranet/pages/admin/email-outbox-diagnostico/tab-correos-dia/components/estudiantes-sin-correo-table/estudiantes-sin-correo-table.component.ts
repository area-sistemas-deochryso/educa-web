import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EstudianteSinCorreoApoderado } from '../../models/correos-dia.models';
import { EduTable, EduTag } from '@edu-ui';

@Component({
	selector: 'app-estudiantes-sin-correo-table',
	standalone: true,
	imports: [EduTable, EduTag],
	templateUrl: './estudiantes-sin-correo-table.component.html',
	styleUrl: './estudiantes-sin-correo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstudiantesSinCorreoTableComponent {
	readonly data = input.required<EstudianteSinCorreoApoderado[]>();
}
