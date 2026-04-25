import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	CorrelationEmailOutboxDto,
	OUTBOX_ESTADO_SEVERITY_MAP,
	SECTION_DEFENSIVE_CAP,
} from '../../models';

@Component({
	selector: 'app-correlation-emails-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './correlation-emails-section.component.html',
	styleUrl: './correlation-emails-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationEmailsSectionComponent {
	readonly items = input.required<CorrelationEmailOutboxDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);

	getEstadoSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
		return OUTBOX_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}
}
