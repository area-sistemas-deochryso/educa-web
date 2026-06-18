import { DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { SlowRequestEntry } from '../../models/runtime-health.models';

@Component({
	selector: 'app-slow-requests-table',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, TableModule, TagModule],
	templateUrl: './slow-requests-table.component.html',
	styleUrl: './slow-requests-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlowRequestsTableComponent {
	readonly slowRequests = input<SlowRequestEntry[]>([]);
	readonly loading = input(false);

	readonly refresh = output<void>();

	getLatencySeverity(p95: number): 'success' | 'warn' | 'danger' {
		if (p95 >= 2000) return 'danger';
		if (p95 >= 500) return 'warn';
		return 'success';
	}

	onRefresh(): void {
		this.refresh.emit();
	}
}
