import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

import { RateLimitStats } from '../../models';

@Component({
	selector: 'app-rate-limit-stats',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	templateUrl: './rate-limit-stats.component.html',
	styleUrl: './rate-limit-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitStatsComponent {
	readonly stats = input<RateLimitStats | null>(null);
	readonly loading = input<boolean>(false);
}
