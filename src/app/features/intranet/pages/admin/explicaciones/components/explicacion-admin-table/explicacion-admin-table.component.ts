import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ExplicacionAdminDto } from '../../models/explicacion-admin.models';
import { EduButton, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

/**
 * Tabla presentacional del listado admin de explicaciones — activas e inactivas.
 * Sin paginación server-side: `GET /api/admin/explicaciones` trae todas las filas.
 */
@Component({
	selector: 'app-explicacion-admin-table',
	standalone: true,
	imports: [EduButton, EduTable, EduTag, EduTooltip, EduTemplate],
	templateUrl: './explicacion-admin-table.component.html',
	styleUrl: './explicacion-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplicacionAdminTableComponent {
	readonly items = input.required<ExplicacionAdminDto[]>();
	readonly loading = input(false);

	readonly edit = output<ExplicacionAdminDto>();
	readonly remove = output<ExplicacionAdminDto>();
}
