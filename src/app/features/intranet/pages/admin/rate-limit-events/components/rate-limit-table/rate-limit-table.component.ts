import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CorrelationIdPillComponent } from '@shared/components/correlation-id-pill';

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
	readonly items = input<RateLimitEventListaDto[]>([]);
	readonly rowSelected = output<RateLimitEventListaDto>();

	readonly displayPolicy = displayPolicy;

	onRowSelect(item: RateLimitEventListaDto): void {
		this.rowSelected.emit(item);
	}

	truncateCorrelation(id: string | null): string {
		if (!id) return '—';
		return id.length > 12 ? id.slice(0, 12) + '…' : id;
	}
}
