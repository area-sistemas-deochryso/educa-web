import { DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { SlowRequestEntry } from '../../models/runtime-health.models';
import { EduButton, EduTable, EduTag } from '@edu-ui';

@Component({
	selector: 'app-slow-requests-table',
	standalone: true,
	imports: [DecimalPipe, EduButton, EduTable, EduTag],
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
