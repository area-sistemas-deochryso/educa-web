import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UnusedIndexDto } from '../../models/diagnostico-db.models';
import { EduButton, EduTable } from '@edu-ui';

@Component({
	selector: 'app-unused-indexes-table',
	standalone: true,
	imports: [DecimalPipe, EduButton, EduTable],
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
