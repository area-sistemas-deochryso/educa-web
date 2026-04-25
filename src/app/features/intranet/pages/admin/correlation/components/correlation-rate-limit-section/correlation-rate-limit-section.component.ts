import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CorrelationRateLimitEventDto, SECTION_DEFENSIVE_CAP } from '../../models';

@Component({
	selector: 'app-correlation-rate-limit-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './correlation-rate-limit-section.component.html',
	styleUrl: './correlation-rate-limit-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationRateLimitSectionComponent {
	readonly items = input.required<CorrelationRateLimitEventDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);

	displayPolicy(policy: string | null): string {
		return policy ?? 'global';
	}
}
