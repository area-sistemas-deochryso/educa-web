import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { PageHeaderComponent } from '@intranet-shared/components';
import {
	SkeletonColumnDef,
	TableSkeletonComponent,
} from '@intranet-shared/components/table-skeleton';

import { RateLimitDetailDrawerComponent } from './components/rate-limit-detail-drawer';
import { RateLimitFiltersComponent } from './components/rate-limit-filters';
import { RateLimitStatsComponent } from './components/rate-limit-stats';
import { RateLimitTableComponent } from './components/rate-limit-table';
import { RateLimitEventFiltro, RateLimitEventListaDto } from './models';
import { RateLimitEventsFacade } from './services';

@Component({
	selector: 'app-rate-limit-events',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		ToastModule,
		PageHeaderComponent,
		TableSkeletonComponent,
		RateLimitStatsComponent,
		RateLimitFiltersComponent,
		RateLimitTableComponent,
		RateLimitDetailDrawerComponent,
	],
	providers: [MessageService],
	templateUrl: './rate-limit-events.component.html',
	styleUrl: './rate-limit-events.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitEventsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(RateLimitEventsFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	// #endregion

	// #region Skeleton
	readonly tableSkeletonColumns: SkeletonColumnDef[] = [
		{ width: '120px', cellType: 'text' },
		{ width: '70px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text' },
		{ width: '100px', cellType: 'badge' },
		{ width: '90px', cellType: 'text' },
		{ width: '110px', cellType: 'badge' },
		{ width: '90px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '100px', cellType: 'text' },
		{ width: '140px', cellType: 'text' },
		{ width: '60px', cellType: 'actions' },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		// Plan 32 Chat 4 — leer correlationId del query param y aplicarlo como
		// filtro inicial. Si no viene, carga normal.
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const correlationId = params.get('correlationId');
				if (correlationId) {
					this.facade.updateFilter({ correlationId });
				} else if (!this.vm().tableReady) {
					this.facade.loadData();
				}
			});
	}
	// #endregion

	// #region Event handlers
	onRefresh(): void {
		this.facade.refresh();
	}

	onFilterChange(partial: Partial<RateLimitEventFiltro>): void {
		this.facade.updateFilter(partial);
	}

	onClearFilters(): void {
		this.facade.clearFilters();
	}

	onRowSelected(item: RateLimitEventListaDto): void {
		this.facade.openDetail(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDrawer();
		}
	}
	// #endregion
}
