import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
	BREADCRUMB_ICON_MAP,
	BREADCRUMB_LABEL_MAP,
	CorrelationBreadcrumbDto,
} from '../../models';
import { EduTag } from '@edu-ui';

/**
 * Plan 41 F4b — sección «Pasos previos»: lo que hizo el cliente justo antes del
 * error (navegaciones, requests, error), tal como lo envió el tracker (ADR-0008).
 * Se renderiza siempre; sin datos muestra un aviso en vez de desaparecer.
 */
@Component({
	selector: 'app-correlation-breadcrumbs-section',
	standalone: true,
	imports: [EduTag],
	templateUrl: './correlation-breadcrumbs-section.component.html',
	styleUrl: './correlation-breadcrumbs-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationBreadcrumbsSectionComponent {
	readonly items = input<readonly CorrelationBreadcrumbDto[]>([]);

	readonly hasItems = computed(() => this.items().length > 0);

	readonly iconMap = BREADCRUMB_ICON_MAP;
	readonly labelMap = BREADCRUMB_LABEL_MAP;

	/** «hace 2,3 s» / «hace 340 ms» / «al momento del error». */
	formatOffset(offsetMs: number): string {
		if (offsetMs <= 0) return 'al momento del error';
		if (offsetMs < 1000) return `hace ${Math.round(offsetMs)} ms`;
		if (offsetMs < 60_000) return `hace ${(offsetMs / 1000).toFixed(1).replace('.', ',')} s`;
		return `hace ${Math.floor(offsetMs / 60_000)} min ${Math.round((offsetMs % 60_000) / 1000)} s`;
	}

	getStatusSeverity(statusCode: number): 'danger' | 'warn' | 'success' {
		if (statusCode >= 500) return 'danger';
		if (statusCode >= 400) return 'warn';
		return 'success';
	}
}
