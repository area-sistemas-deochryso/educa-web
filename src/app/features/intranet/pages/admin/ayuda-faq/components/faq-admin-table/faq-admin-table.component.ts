import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { FaqAdminDto } from '../../models/faq-admin.models';

/**
 * Tabla presentacional del listado admin de FAQ — activas e inactivas
 * (a diferencia del listado público de F4, que solo trae activas).
 * Sin paginación server-side: `GET /api/admin/faq` trae todas las filas.
 */
@Component({
	selector: 'app-faq-admin-table',
	standalone: true,
	imports: [ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './faq-admin-table.component.html',
	styleUrl: './faq-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqAdminTableComponent {
	readonly items = input.required<FaqAdminDto[]>();
	readonly loading = input(false);

	readonly edit = output<FaqAdminDto>();
	readonly remove = output<FaqAdminDto>();

	pasosCount(faq: FaqAdminDto): number {
		return faq.wizard?.pasos.length ?? 0;
	}
}
