import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	CorrelationReporteUsuarioDto,
	REPORTE_ESTADO_SEVERITY_MAP,
	SECTION_DEFENSIVE_CAP,
} from '../../models';

@Component({
	selector: 'app-correlation-reports-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './correlation-reports-section.component.html',
	styleUrl: './correlation-reports-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationReportsSectionComponent {
	readonly items = input.required<CorrelationReporteUsuarioDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);

	getEstadoSeverity(estado: string): 'info' | 'warn' | 'success' | 'secondary' {
		return REPORTE_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}
}
