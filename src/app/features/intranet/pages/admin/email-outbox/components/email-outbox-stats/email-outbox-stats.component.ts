import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { EmailOutboxEstadisticas } from '@data/models';

@Component({
	selector: 'app-email-outbox-stats',
	standalone: true,
	imports: [DecimalPipe, TagModule, TooltipModule],
	templateUrl: './email-outbox-stats.component.html',
	styleUrl: './email-outbox-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxStatsComponent {
	readonly stats = input.required<EmailOutboxEstadisticas>();

	/** Plan 43 Chat 1.1 — chip de origen del contador ("OutboxTotal" o "OutboxRango"). */
	readonly sourceChip = computed(() => this.stats().source ?? null);

	/** Plan 43 Chat 1.1 — ventana legible para tooltip. */
	readonly windowTooltip = computed(() => this.stats().timeWindowLabel ?? '');
}
