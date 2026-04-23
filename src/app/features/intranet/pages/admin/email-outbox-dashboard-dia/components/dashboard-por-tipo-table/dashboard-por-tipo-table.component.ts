import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { EmailDashboardPorTipo } from '../../models/email-dashboard-dia.models';

@Component({
	selector: 'app-dashboard-por-tipo-table',
	standalone: true,
	imports: [TableModule, TagModule],
	templateUrl: './dashboard-por-tipo-table.component.html',
	styleUrl: './dashboard-por-tipo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPorTipoTableComponent {
	readonly data = input.required<EmailDashboardPorTipo[]>();
}
