import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	CorrelationEmailOutboxDto,
	CorrelationErrorLogDto,
	CorrelationRateLimitEventDto,
	CorrelationReporteUsuarioDto,
	OUTBOX_ESTADO_SEVERITY_MAP,
	REPORTE_ESTADO_SEVERITY_MAP,
	SEVERIDAD_SEVERITY_MAP,
	TIMELINE_ICON_MAP,
	TIMELINE_KIND_CLASS_MAP,
	TIMELINE_KIND_LABEL_MAP,
	TimelineEvent,
} from '../../models';

/**
 * Plan 41 F1 — vista timeline cronológica unificada del hub correlation.
 *
 * Recibe los `TimelineEvent[]` ya ordenados por fecha descendente desde el
 * store y los renderiza como steps verticales con icono + color por tipo.
 * No hace IO ni decide ordenamiento — solo presenta.
 */
@Component({
	selector: 'app-correlation-timeline-section',
	standalone: true,
	imports: [CommonModule, DatePipe, TagModule, TooltipModule],
	templateUrl: './correlation-timeline-section.component.html',
	styleUrl: './correlation-timeline-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationTimelineSectionComponent {
	readonly events = input.required<TimelineEvent[]>();

	readonly count = computed(() => this.events().length);

	readonly iconMap = TIMELINE_ICON_MAP;
	readonly kindClassMap = TIMELINE_KIND_CLASS_MAP;
	readonly kindLabelMap = TIMELINE_KIND_LABEL_MAP;

	asError(payload: TimelineEvent['payload']): CorrelationErrorLogDto {
		return payload as CorrelationErrorLogDto;
	}

	asRateLimit(payload: TimelineEvent['payload']): CorrelationRateLimitEventDto {
		return payload as CorrelationRateLimitEventDto;
	}

	asReporte(payload: TimelineEvent['payload']): CorrelationReporteUsuarioDto {
		return payload as CorrelationReporteUsuarioDto;
	}

	asOutbox(payload: TimelineEvent['payload']): CorrelationEmailOutboxDto {
		return payload as CorrelationEmailOutboxDto;
	}

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
		// payload.id es number en los 4 DTOs
		const id = (event.payload as { id: number }).id;
		return `${event.kind}:${id}:${event.fecha}`;
	}
}
