import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ExplicacionAdminDto } from '../../models/explicacion-admin.models';
import { CardActionsComponent, CardRowComponent, MobileCardListComponent, injectIsMobile } from '@shared/components';
import { EduButton, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

/**
 * Tabla presentacional del listado admin de explicaciones — activas e inactivas.
 * Sin paginación server-side: `GET /api/admin/explicaciones` trae todas las filas.
 */
@Component({
	selector: 'app-explicacion-admin-table',
	standalone: true,
	imports: [MobileCardListComponent, CardRowComponent, CardActionsComponent, EduButton, EduTable, EduTag, EduTooltip, EduTemplate],
	templateUrl: './explicacion-admin-table.component.html',
	styleUrl: './explicacion-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplicacionAdminTableComponent {
	readonly items = input.required<ExplicacionAdminDto[]>();
	readonly loading = input(false);
	readonly isMobile = injectIsMobile();

	readonly edit = output<ExplicacionAdminDto>();
	readonly remove = output<ExplicacionAdminDto>();
}
