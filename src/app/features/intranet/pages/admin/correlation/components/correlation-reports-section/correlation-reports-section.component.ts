import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import {
	CorrelationReporteUsuarioDto,
	REPORTE_ESTADO_SEVERITY_MAP,
	SECTION_DEFENSIVE_CAP,
} from '../../models';
import { EduButton, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-correlation-reports-section',
	standalone: true,
	imports: [CommonModule, DatePipe, RouterLink, ButtonModule, EduButton, EduTable, EduTag, EduTooltip, EduTemplate],
	templateUrl: './correlation-reports-section.component.html',
	styleUrl: './correlation-reports-section.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationReportsSectionComponent {
	private router = inject(Router);

	readonly items = input.required<CorrelationReporteUsuarioDto[]>();
	readonly correlationId = input.required<string | null>();

	readonly cappedRows = computed(() => this.items().length >= SECTION_DEFENSIVE_CAP);
	readonly count = computed(() => this.items().length);

	getEstadoSeverity(estado: string): 'info' | 'warn' | 'success' | 'secondary' {
		return REPORTE_ESTADO_SEVERITY_MAP[estado] ?? 'info';
	}

	onGoToReport(row: CorrelationReporteUsuarioDto): void {
		this.router.navigate(['/intranet/admin/monitoreo/incidencias/reportes'], {
			queryParams: { id: row.id },
		});
	}
}
