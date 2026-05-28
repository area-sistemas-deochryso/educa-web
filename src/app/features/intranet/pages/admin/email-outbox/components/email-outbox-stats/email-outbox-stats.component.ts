import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { EmailOutboxEstadisticas, EmailOutboxTendencia } from '@data/models';
import { MiniSparklineComponent } from '@intranet-shared/components';

import { trendSummary } from '../../utils/trend-summary';

@Component({
	selector: 'app-email-outbox-stats',
	standalone: true,
	imports: [DecimalPipe, TagModule, TooltipModule, MiniSparklineComponent],
	templateUrl: './email-outbox-stats.component.html',
	styleUrl: './email-outbox-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxStatsComponent {
	readonly stats = input.required<EmailOutboxEstadisticas>();
	readonly tendencias = input<readonly EmailOutboxTendencia[]>([]);

	readonly sourceChip = computed(() => this.stats().source ?? null);
	readonly windowTooltip = computed(() => this.stats().timeWindowLabel ?? '');

	readonly sentTrend = computed(() => this.tendencias().map((t) => t.enviados));
	readonly failedTrend = computed(() => this.tendencias().map((t) => t.fallidos));
	readonly sentSummary = computed(() => trendSummary(this.sentTrend()));
	readonly failedSummary = computed(() => trendSummary(this.failedTrend()));
	readonly hasTrend = computed(() => this.tendencias().length > 0);
}
