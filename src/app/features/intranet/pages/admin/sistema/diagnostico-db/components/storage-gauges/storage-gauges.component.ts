import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DatabaseFileStatsDto } from '../../models/diagnostico-db.models';
import { DecimalPipe } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
	selector: 'app-storage-gauges',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, ProgressBarModule],
	templateUrl: './storage-gauges.component.html',
	styleUrl: './storage-gauges.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageGaugesComponent {
	readonly files = input<DatabaseFileStatsDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}

	getFillColor(fillPercent: number): string {
		if (fillPercent >= 90) return 'var(--red-500, #ef4444)';
		if (fillPercent >= 75) return 'var(--yellow-500, #eab308)';
		return 'var(--green-500, #22c55e)';
	}
}
