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
import { SelectModule } from 'primeng/select';

import {
	ALERT_RECOMMENDATIONS,
	AlertLevel,
	METRIC_LABELS,
	RECOMMENDATION_TAB_TARGETS,
	RuntimeHealthAlert,
} from '../../models/runtime-health.models';

type SeverityFilter = 'all' | 'warn' | 'critical';

export interface CollapsedAlert {
	metricKey: string;
	alertLevel: AlertLevel;
	peakValue: number;
	thresholdBreached: number;
	snapshotPattern: string;
	firstTimestamp: string;
	lastTimestamp: string;
	count: number;
}

const PAGE_SIZE = 15;

@Component({
	selector: 'app-alert-timeline',
	standalone: true,
	imports: [DatePipe, DecimalPipe, FormsModule, ButtonModule, SelectModule, SelectButtonModule, TagModule],
	templateUrl: './alert-timeline.component.html',
	styleUrl: './alert-timeline.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertTimelineComponent {
	readonly alerts = input<RuntimeHealthAlert[]>([]);
	readonly loading = input(false);

	readonly refresh = output<void>();
	readonly navigateTab = output<string>();

	readonly severityFilter = signal<SeverityFilter>('all');
	readonly metricFilter = signal<string | null>(null);
	readonly page = signal(1);

	readonly filterOptions: { label: string; value: SeverityFilter }[] = [
		{ label: 'Todos', value: 'all' },
		{ label: 'Warning', value: 'warn' },
		{ label: 'Critical', value: 'critical' },
	];

	readonly metricOptions = computed(() => {
		const keys = new Set(this.alerts().map(a => a.metricKey));
		return [
			{ label: 'Todas las métricas', value: null },
			...[...keys].map(k => ({ label: METRIC_LABELS[k] ?? k, value: k })),
		];
	});

	private readonly filteredAlerts = computed(() => {
		const severity = this.severityFilter();
		const metric = this.metricFilter();
		let result = this.alerts();
		if (severity !== 'all') result = result.filter(a => a.alertLevel === severity);
		if (metric) result = result.filter(a => a.metricKey === metric);
		return result;
	});

	readonly collapsedAlerts = computed(() => {
		const alerts = this.filteredAlerts();
		if (alerts.length === 0) return [];

		const groups: CollapsedAlert[] = [];
		let current: CollapsedAlert | null = null;

		for (const a of alerts) {
			if (current && current.metricKey === a.metricKey && current.alertLevel === a.alertLevel) {
				current.count++;
				current.lastTimestamp = a.timestamp;
				if (a.value > current.peakValue) current.peakValue = a.value;
			} else {
				current = {
					metricKey: a.metricKey,
					alertLevel: a.alertLevel,
					peakValue: a.value,
					thresholdBreached: a.thresholdBreached,
					snapshotPattern: a.snapshotPattern,
					firstTimestamp: a.timestamp,
					lastTimestamp: a.timestamp,
					count: 1,
				};
				groups.push(current);
			}
		}

		return groups;
	});

	readonly totalPages = computed(() => Math.max(1, Math.ceil(this.collapsedAlerts().length / PAGE_SIZE)));

	readonly pagedAlerts = computed(() => {
		const all = this.collapsedAlerts();
		const p = Math.min(this.page(), this.totalPages());
		const start = (p - 1) * PAGE_SIZE;
		return all.slice(start, start + PAGE_SIZE);
	});

	readonly totalFilteredCount = computed(() => this.filteredAlerts().length);

	getMetricLabel(key: string): string {
		return METRIC_LABELS[key] ?? key;
	}

	getSeverityTag(level: AlertLevel): 'warn' | 'danger' {
		return level === 'critical' ? 'danger' : 'warn';
	}

	getRecommendation(metricKey: string): string | null {
		return ALERT_RECOMMENDATIONS[metricKey] ?? null;
	}

	getTabTarget(metricKey: string): string | null {
		return RECOMMENDATION_TAB_TARGETS[metricKey] ?? null;
	}

	onRecommendationClick(metricKey: string): void {
		const tab = RECOMMENDATION_TAB_TARGETS[metricKey];
		if (tab) this.navigateTab.emit(tab);
	}

	onRefresh(): void {
		this.refresh.emit();
	}

	onSeverityChange(): void {
		this.page.set(1);
	}

	onMetricChange(): void {
		this.page.set(1);
	}

	prevPage(): void {
		this.page.update(p => Math.max(1, p - 1));
	}

	nextPage(): void {
		this.page.update(p => Math.min(this.totalPages(), p + 1));
	}
}
