import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { SkeletonColumnDef } from '@intranet-shared/components';
import { UiMappingService } from '@intranet-shared/services';
import { EmailQuarantineListaDto } from '@data/models';

/**
 * Plan 37 Chat 3 — tabla server-paginated de cuarentenas activas/liberadas.
 * Pattern B4 + B5: header UPPERCASE, row-actions triplet (Ver / Liberar).
 */
@Component({
	selector: 'app-quarantine-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule, DatePipe, RouterLink],
	templateUrl: './quarantine-table.component.html',
	styleUrl: './quarantine-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarantineTableComponent {
	readonly uiMapping = inject(UiMappingService);

	readonly items = input.required<EmailQuarantineListaDto[]>();
	readonly loading = input<boolean>(false);
	readonly total = input<number>(0);
	readonly page = input<number>(1);
	readonly pageSize = input<number>(20);
	readonly hasActiveFilters = input<boolean>(false);

	readonly viewDetail = output<EmailQuarantineListaDto>();
	readonly release = output<EmailQuarantineListaDto>();
	readonly lazyLoad = output<TableLazyLoadEvent>();

	static readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'avatar-text' },
		{ width: '180px', cellType: 'badge' },
		{ width: '90px', cellType: 'badge' },
		{ width: '160px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '110px', cellType: 'actions' },
	];

	onViewDetail(item: EmailQuarantineListaDto): void {
		this.viewDetail.emit(item);
	}

	onRelease(item: EmailQuarantineListaDto): void {
		this.release.emit(item);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		this.lazyLoad.emit(event);
	}

	estadoLabel(estado: boolean): string {
		return estado ? 'Activa' : 'Liberada';
	}

	estadoSeverity(estado: boolean): 'success' | 'danger' {
		return this.uiMapping.getEstadoSeverity(estado);
	}

	countSeverity(count: number): 'success' | 'warn' | 'danger' {
		if (count >= 3) return 'danger';
		if (count === 2) return 'warn';
		return 'success';
	}

	domainOf(email: string): string {
		const at = email.lastIndexOf('@');
		return at >= 0 ? email.substring(at + 1) : '';
	}
}
