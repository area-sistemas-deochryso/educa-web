import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { SkeletonColumnDef } from '@intranet-shared/components';
import { UiMappingService } from '@intranet-shared/services';
import { EmailDomainPauseListaDto } from '@data/models';

/**
 * Plan 37 Chat 3 — tabla client-side de dominios pausados
 * (≤ 50 filas activas, no necesita server-side).
 */
@Component({
	selector: 'app-domain-pauses-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule, DatePipe],
	templateUrl: './domain-pauses-table.component.html',
	styleUrl: './domain-pauses-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainPausesTableComponent {
	readonly uiMapping = inject(UiMappingService);

	readonly items = input.required<EmailDomainPauseListaDto[]>();
	readonly loading = input<boolean>(false);
	readonly hasActiveFilters = input<boolean>(false);

	readonly release = output<EmailDomainPauseListaDto>();

	static readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '180px', cellType: 'badge' },
		{ width: '110px', cellType: 'text' },
		{ width: '170px', cellType: 'text' },
		{ width: '110px', cellType: 'badge' },
		{ width: '110px', cellType: 'actions' },
	];

	onRelease(item: EmailDomainPauseListaDto): void {
		this.release.emit(item);
	}

	estadoLabel(estado: boolean): string {
		return estado ? 'Activa' : 'Liberada';
	}

	estadoSeverity(estado: boolean): 'success' | 'danger' {
		return this.uiMapping.getEstadoSeverity(estado);
	}
}
