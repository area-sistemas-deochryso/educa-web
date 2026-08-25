import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { MissingIndexDto } from '../../models/diagnostico-db.models';
import { EduButton, EduTable, EduTag } from '@edu-ui';

const HIGH_IMPACT_THRESHOLD = 10_000;
const MEDIUM_IMPACT_THRESHOLD = 1_000;

@Component({
	selector: 'app-missing-indexes-table',
	standalone: true,
	imports: [DecimalPipe, EduButton, EduTable, EduTag],
	templateUrl: './missing-indexes-table.component.html',
	styleUrl: './missing-indexes-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissingIndexesTableComponent {
	readonly indexes = input<MissingIndexDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	readonly sorted = computed(() => [...this.indexes()].sort((a, b) => b.estimatedImpact - a.estimatedImpact));

	onRefresh(): void {
		this.refresh.emit();
	}

	impactSeverity(estimatedImpact: number): 'danger' | 'warn' | 'info' {
		if (estimatedImpact >= HIGH_IMPACT_THRESHOLD) return 'danger';
		if (estimatedImpact >= MEDIUM_IMPACT_THRESHOLD) return 'warn';
		return 'info';
	}
}
