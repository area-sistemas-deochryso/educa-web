import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { EmailOutboxEstadisticas } from '@data/models/email-outbox.models';

@Component({
	selector: 'app-email-outbox-stats',
	standalone: true,
	imports: [DecimalPipe],
	templateUrl: './email-outbox-stats.component.html',
	styleUrl: './email-outbox-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxStatsComponent {
	readonly stats = input.required<EmailOutboxEstadisticas>();
}
