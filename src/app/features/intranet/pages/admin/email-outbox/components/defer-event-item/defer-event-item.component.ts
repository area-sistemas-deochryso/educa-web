import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { UiMappingService } from '@shared/services';
import { EmailDeferEventDto } from '@data/models';

/**
 * Plan 37 Chat 3 — item presentacional del timeline de eventos.
 * Truncado de diagnostic-code a 100 chars con tooltip completo.
 */
@Component({
	selector: 'app-defer-event-item',
	standalone: true,
	imports: [TagModule, TooltipModule, DatePipe, RouterLink],
	templateUrl: './defer-event-item.component.html',
	styleUrl: './defer-event-item.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeferEventItemComponent {
	readonly uiMapping = inject(UiMappingService);
	readonly event = input.required<EmailDeferEventDto>();

	truncate(value: string | null, max = 100): string {
		if (!value) return '';
		return value.length > max ? value.substring(0, max) + '…' : value;
	}
}
