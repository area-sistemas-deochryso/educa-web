import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { CorrelationRequestMetricDto } from '../../models';
import { EduTag, EduTooltip } from '@edu-ui';

/**
 * Plan 41 F3 — sección "Request" del header del hub: lifecycle HTTP persistido
 * del request correlacionado, con comparación vs. p95 reciente de la ruta.
 * Se renderiza siempre (nunca se oculta) — cuando `metric` es `null` muestra un
 * aviso explícito de "no registrado" en vez de desaparecer.
 */
@Component({
	selector: 'app-correlation-request-section',
	standalone: true,
	imports: [DatePipe, DecimalPipe, EduTag, EduTooltip],
	templateUrl: './correlation-request-section.component.html',
	styleUrl: './correlation-request-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationRequestSectionComponent {
	readonly metric = input<CorrelationRequestMetricDto | null>(null);

	readonly hasMetric = computed(() => this.metric() !== null);

	readonly comparison = computed<{ delta: number; overP95: boolean } | null>(() => {
		const m = this.metric();
		if (!m || m.routeP95Ms == null) return null;
		const delta = m.durationMs - m.routeP95Ms;
		return { delta, overP95: delta > 0 };
	});

	getStatusSeverity(statusCode: number): 'danger' | 'warn' {
		return statusCode >= 500 ? 'danger' : 'warn';
	}
}
