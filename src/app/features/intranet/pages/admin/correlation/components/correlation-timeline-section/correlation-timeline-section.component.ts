import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	CorrelationEmailOutboxDto,
	CorrelationErrorLogDto,
	CorrelationReporteUsuarioDto,
	OUTBOX_ESTADO_SEVERITY_MAP,
	REPORTE_ESTADO_SEVERITY_MAP,
	SEVERIDAD_SEVERITY_MAP,
	TIMELINE_ICON_MAP,
	TIMELINE_KIND_CLASS_MAP,
	TIMELINE_KIND_LABEL_MAP,
	type TimelineEvent,
} from '../../models';

@Component({
	selector: 'app-correlation-timeline-section',
	standalone: true,
	imports: [CommonModule, DatePipe, ButtonModule, TagModule, TooltipModule],
	templateUrl: './correlation-timeline-section.component.html',
	styleUrl: './correlation-timeline-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationTimelineSectionComponent {
	private readonly router = inject(Router);

	readonly events = input.required<TimelineEvent[]>();

	readonly count = computed(() => this.events().length);

	readonly iconMap = TIMELINE_ICON_MAP;
	readonly kindClassMap = TIMELINE_KIND_CLASS_MAP;
	readonly kindLabelMap = TIMELINE_KIND_LABEL_MAP;

	getErrorSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return SEVERIDAD_SEVERITY_MAP[severidad] ?? 'info';
	}

	getReporteSeverity(estado: string): 'info' | 'warn' | 'success' | 'secondary' {
		return REPORTE_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}

	getOutboxSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
		return OUTBOX_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}

	trackEvent(_index: number, event: TimelineEvent): string {
		const id = (event.payload as { id: number }).id;
		return `${event.kind}:${id}:${event.fecha}`;
	}

	// #region Navigation anchors (Plan 41 F2)
	canGoToGroup(row: CorrelationErrorLogDto): boolean {
		return !!row.errorGroupCode;
	}

	onGoToGroup(row: CorrelationErrorLogDto): void {
		if (!row.errorGroupCode) return;
		void this.router.navigate(['/intranet/admin/monitoreo/incidencias/errores'], {
			queryParams: { fingerprint: row.errorGroupCode },
		});
	}

	onGoToReport(row: CorrelationReporteUsuarioDto): void {
		void this.router.navigate(['/intranet/admin/monitoreo/incidencias/reportes'], {
			queryParams: { id: row.id },
		});
	}

	onGoToOutbox(row: CorrelationEmailOutboxDto): void {
		void this.router.navigate(['/intranet/admin/monitoreo/correos/bandeja'], {
			queryParams: { destinatario: row.destinatarioMasked },
		});
	}
	// #endregion
}
