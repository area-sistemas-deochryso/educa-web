import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { TableSizeDto } from '../../models/diagnostico-db.models';

@Component({
	selector: 'app-table-sizes-table',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, TableModule],
	templateUrl: './table-sizes-table.component.html',
	styleUrl: './table-sizes-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSizesTableComponent {
	readonly tables = input<TableSizeDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
