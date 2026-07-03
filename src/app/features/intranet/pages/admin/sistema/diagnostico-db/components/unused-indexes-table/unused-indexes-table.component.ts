import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { UnusedIndexDto } from '../../models/diagnostico-db.models';

@Component({
	selector: 'app-unused-indexes-table',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, TableModule],
	templateUrl: './unused-indexes-table.component.html',
	styleUrl: './unused-indexes-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnusedIndexesTableComponent {
	readonly indexes = input<UnusedIndexDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
