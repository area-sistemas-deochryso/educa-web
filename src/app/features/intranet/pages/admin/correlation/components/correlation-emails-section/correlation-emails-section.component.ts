import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
	CorrelationEmailOutboxDto,
	OUTBOX_ESTADO_SEVERITY_MAP,
	SECTION_DEFENSIVE_CAP,
} from '../../models';
import { EduButton, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-correlation-emails-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, EduButton, EduTable, EduTag, EduTooltip, EduTemplate],
	templateUrl: './correlation-emails-section.component.html',
	styleUrl: './correlation-emails-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationEmailsSectionComponent {
	private router = inject(Router);

	readonly items = input.required<CorrelationEmailOutboxDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);

	getEstadoSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
		return OUTBOX_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}

	onGoToOutbox(row: CorrelationEmailOutboxDto): void {
		this.router.navigate(['/intranet/admin/monitoreo/correos/bandeja'], {
			queryParams: { destinatario: row.destinatarioMasked },
		});
	}
}
