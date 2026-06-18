import { DatePipe, DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';

import {
	ALERT_RECOMMENDATIONS,
	AlertLevel,
	METRIC_LABELS,
	RuntimeHealthAlert,
} from '../../models/runtime-health.models';

type SeverityFilter = 'all' | 'warn' | 'critical';

@Component({
	selector: 'app-alert-timeline',
	standalone: true,
	imports: [DatePipe, DecimalPipe, FormsModule, ButtonModule, SelectButtonModule, TagModule],
	templateUrl: './alert-timeline.component.html',
	styleUrl: './alert-timeline.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertTimelineComponent {
	readonly alerts = input<RuntimeHealthAlert[]>([]);
	readonly loading = input(false);

	readonly refresh = output<void>();

	readonly severityFilter = signal<SeverityFilter>('all');

	readonly filterOptions: { label: string; value: SeverityFilter }[] = [
		{ label: 'Todos', value: 'all' },
		{ label: 'Warning', value: 'warn' },
		{ label: 'Critical', value: 'critical' },
	];

	readonly filteredAlerts = computed(() => {
		const filter = this.severityFilter();
		const all = this.alerts();
		if (filter === 'all') return all;
		return all.filter(a => a.alertLevel === filter);
	});

	getMetricLabel(key: string): string {
		return METRIC_LABELS[key] ?? key;
	}

	getSeverityTag(level: AlertLevel): 'warn' | 'danger' {
		return level === 'critical' ? 'danger' : 'warn';
	}

	getRecommendation(metricKey: string): string | null {
		return ALERT_RECOMMENDATIONS[metricKey] ?? null;
	}

	onRefresh(): void {
		this.refresh.emit();
	}
}
