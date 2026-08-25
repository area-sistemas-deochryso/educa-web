import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmailDashboardFallosPorSender, TipoFalloLabelPipe } from '@features/intranet/pages/admin/email-outbox-shared';
import { EduTable, EduTag } from '@edu-ui';

@Component({
	selector: 'app-dashboard-fallos-por-sender-table',
	standalone: true,
	imports: [EduTable, EduTag, TipoFalloLabelPipe],
	templateUrl: './dashboard-fallos-por-sender-table.component.html',
	styleUrl: './dashboard-fallos-por-sender-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFallosPorSenderTableComponent {
	readonly data = input.required<EmailDashboardFallosPorSender[]>();
	readonly isEmpty = computed(() => this.data().length === 0);
}
