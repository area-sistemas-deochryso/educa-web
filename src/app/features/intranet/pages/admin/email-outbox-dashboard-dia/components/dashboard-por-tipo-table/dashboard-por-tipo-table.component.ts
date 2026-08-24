import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmailDashboardPorTipo } from '@features/intranet/pages/admin/email-outbox-shared';
import { EduTable, EduTag } from '@edu-ui';

@Component({
	selector: 'app-dashboard-por-tipo-table',
	standalone: true,
	imports: [EduTable, EduTag],
	templateUrl: './dashboard-por-tipo-table.component.html',
	styleUrl: './dashboard-por-tipo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPorTipoTableComponent {
	readonly data = input.required<EmailDashboardPorTipo[]>();
}
