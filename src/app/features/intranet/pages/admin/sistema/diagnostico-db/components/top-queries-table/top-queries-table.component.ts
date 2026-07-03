import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { TopQueryDto } from '../../models/diagnostico-db.models';

@Component({
	selector: 'app-top-queries-table',
	standalone: true,
	imports: [DecimalPipe, DatePipe, ButtonModule, TableModule, TooltipModule],
	templateUrl: './top-queries-table.component.html',
	styleUrl: './top-queries-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopQueriesTableComponent {
	readonly queries = input<TopQueryDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
