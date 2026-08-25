import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TableSizeDto } from '../../models/diagnostico-db.models';
import { EduButton, EduTable } from '@edu-ui';

@Component({
	selector: 'app-table-sizes-table',
	standalone: true,
	imports: [DecimalPipe, EduButton, EduTable],
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
