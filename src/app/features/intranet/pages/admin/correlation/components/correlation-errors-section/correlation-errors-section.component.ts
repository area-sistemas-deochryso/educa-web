import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	CorrelationErrorLogDto,
	SECTION_DEFENSIVE_CAP,
	SEVERIDAD_SEVERITY_MAP,
} from '../../models';

@Component({
	selector: 'app-correlation-errors-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './correlation-errors-section.component.html',
	styleUrl: './correlation-errors-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationErrorsSectionComponent {
	readonly items = input.required<CorrelationErrorLogDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);
	readonly severidadMap = SEVERIDAD_SEVERITY_MAP;

	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadMap[severidad] ?? 'info';
	}

	getStatusSeverity(httpStatus: number | null): 'danger' | 'warn' | 'info' {
		if (httpStatus == null) return 'info';
		if (httpStatus >= 500) return 'danger';
		if (httpStatus >= 400) return 'warn';
		return 'info';
	}
}
