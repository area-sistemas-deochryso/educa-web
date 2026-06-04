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
import { EmailBlacklistEntry } from '@data/models';

/**
 * Plan 38 Chat 5 — tabla server-paginated de entradas en `EmailBlacklist`.
 * Pattern B4 + B5 de `design-system.md`: header UPPERCASE 0.8rem,
 * row-actions triplet (Ver / Despejar) icon-only con `aria-label`.
 */
@Component({
	selector: 'app-blacklist-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule, DatePipe, RouterLink],
	templateUrl: './blacklist-table.component.html',
	styleUrl: './blacklist-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlacklistTableComponent {
	readonly uiMapping = inject(UiMappingService);

	// #region Inputs
	readonly items = input.required<EmailBlacklistEntry[]>();
	readonly loading = input<boolean>(false);
	readonly total = input<number>(0);
	readonly page = input<number>(1);
	readonly pageSize = input<number>(20);
	readonly hasActiveFilters = input<boolean>(false);
	// #endregion

	// #region Outputs
	readonly viewDetail = output<EmailBlacklistEntry>();
	readonly despejar = output<EmailBlacklistEntry>();
	readonly unblock = output<EmailBlacklistEntry>();
	readonly lazyLoad = output<TableLazyLoadEvent>();
	// #endregion

	// #region Skeleton config (consumido por el smart container)
	static readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '160px', cellType: 'badge' },
		{ width: '70px', cellType: 'text' },
		{ width: '110px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '110px', cellType: 'actions' },
	];
	// #endregion

	// #region Event handlers
	onViewDetail(item: EmailBlacklistEntry): void {
		this.viewDetail.emit(item);
	}

	onDespejar(item: EmailBlacklistEntry): void {
		this.despejar.emit(item);
	}

	onUnblock(item: EmailBlacklistEntry): void {
		this.unblock.emit(item);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		this.lazyLoad.emit(event);
	}
	// #endregion

	// #region Helpers
	estadoSeverity(estado: boolean): 'success' | 'danger' {
		return this.uiMapping.getEstadoSeverity(estado);
	}

	estadoLabel(estado: boolean): string {
		return estado ? 'Activa' : 'Despejada';
	}
	// #endregion
}
