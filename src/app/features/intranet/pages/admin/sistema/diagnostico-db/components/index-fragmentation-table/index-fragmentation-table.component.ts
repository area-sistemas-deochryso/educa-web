import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { IndexFragmentationDto } from '../../models/diagnostico-db.models';

const HIGH_FRAGMENTATION_THRESHOLD = 50;

@Component({
	selector: 'app-index-fragmentation-table',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, TableModule],
	templateUrl: './index-fragmentation-table.component.html',
	styleUrl: './index-fragmentation-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndexFragmentationTableComponent {
	readonly indexes = input<IndexFragmentationDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}

	isHighlyFragmented(fragmentationPercent: number): boolean {
		return fragmentationPercent > HIGH_FRAGMENTATION_THRESHOLD;
	}
}
