import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ExplicacionAdminDto } from '../../models/explicacion-admin.models';

/**
 * Tabla presentacional del listado admin de explicaciones — activas e inactivas.
 * Sin paginación server-side: `GET /api/admin/explicaciones` trae todas las filas.
 */
@Component({
	selector: 'app-explicacion-admin-table',
	standalone: true,
	imports: [ButtonModule, TableModule, TagModule, TooltipModule],
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
