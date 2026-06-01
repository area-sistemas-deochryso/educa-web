import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { EmailDashboardFallosPorSender } from '../../models/email-dashboard-dia.models';
import { TipoFalloLabelPipe } from '@features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-label.pipe';

@Component({
	selector: 'app-dashboard-fallos-por-sender-table',
	standalone: true,
	imports: [TableModule, TagModule, TipoFalloLabelPipe],
	templateUrl: './dashboard-fallos-por-sender-table.component.html',
	styleUrl: './dashboard-fallos-por-sender-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFallosPorSenderTableComponent {
	readonly data = input.required<EmailDashboardFallosPorSender[]>();
	readonly isEmpty = computed(() => this.data().length === 0);
}
