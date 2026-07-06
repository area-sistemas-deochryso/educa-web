import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CorrelationIdPillComponent } from '@intranet-shared/components';

import { RateLimitEventListaDto, displayPolicy } from '../../models';

@Component({
	selector: 'app-rate-limit-table',
	standalone: true,
	imports: [
		CommonModule,
		DatePipe,
		ButtonModule,
		TableModule,
		TagModule,
		TooltipModule,
		CorrelationIdPillComponent,
	],
	templateUrl: './rate-limit-table.component.html',
	styleUrl: './rate-limit-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitTableComponent {
	// #region Inputs
	readonly items = input<RateLimitEventListaDto[]>([]);
	readonly loading = input<boolean>(false);
	readonly total = input<number>(0);
	readonly page = input<number>(1);
	readonly pageSize = input<number>(20);
	// #endregion

	// #region Outputs
	readonly rowSelected = output<RateLimitEventListaDto>();
	readonly lazyLoad = output<TableLazyLoadEvent>();
	// #endregion

	readonly displayPolicy = displayPolicy;

	onRowSelect(item: RateLimitEventListaDto): void {
		this.rowSelected.emit(item);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		this.lazyLoad.emit(event);
	}

	truncateCorrelation(id: string | null): string {
		if (!id) return '—';
		return id.length > 12 ? id.slice(0, 12) + '…' : id;
	}
}
