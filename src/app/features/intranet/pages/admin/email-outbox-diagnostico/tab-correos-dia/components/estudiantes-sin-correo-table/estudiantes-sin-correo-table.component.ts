import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { EstudianteSinCorreoApoderado } from '../../models/correos-dia.models';

@Component({
	selector: 'app-estudiantes-sin-correo-table',
	standalone: true,
	imports: [TableModule, TagModule],
	templateUrl: './estudiantes-sin-correo-table.component.html',
	styleUrl: './estudiantes-sin-correo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstudiantesSinCorreoTableComponent {
	readonly data = input.required<EstudianteSinCorreoApoderado[]>();
}
