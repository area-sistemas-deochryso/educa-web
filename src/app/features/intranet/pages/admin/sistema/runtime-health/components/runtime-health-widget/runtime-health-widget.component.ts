import { DatePipe, DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
	ALERT_RECOMMENDATIONS,
	AlertLevel,
	PATTERN_LABEL,
	PATTERN_SEVERITY,
	RECOMMENDATION_TAB_TARGETS,
	RuntimeHealthSnapshot,
	ThresholdConfig,
	isProbableTelemetryFailure,
} from '../../models/runtime-health.models';

@Component({
	selector: 'app-runtime-health-widget',
	standalone: true,
	imports: [
		DatePipe,
		DecimalPipe,
		FormsModule,
		ButtonModule,
		TagModule,
		ToggleSwitchModule,
		TooltipModule,
	],
	templateUrl: './runtime-health-widget.component.html',
	styleUrl: './runtime-health-widget.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthWidgetComponent {
	// #region Inputs / Outputs
	readonly snapshot = input<RuntimeHealthSnapshot | null>(null);
	readonly loading = input<boolean>(false);
	readonly autoRefresh = input<boolean>(false);
	readonly collapsed = input<boolean>(false);
	readonly thresholds = input<ThresholdConfig[]>([]);

	readonly refresh = output<void>();
	readonly autoRefreshChange = output<boolean>();
	readonly collapsedChange = output<boolean>();
	readonly forceGc = output<void>();
	readonly navigateTab = output<string>();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => this.snapshot() !== null);

	readonly patternLabel = computed(() => {
		const snap = this.snapshot();
		return snap ? PATTERN_LABEL[snap.pattern] : '—';
	});

	readonly patternSeverity = computed(() => {
		const snap = this.snapshot();
		return snap ? PATTERN_SEVERITY[snap.pattern] : 'info';
	});

	readonly patternIcon = computed(() => {
		switch (this.snapshot()?.pattern) {
			case 'OK':
				return 'pi pi-check-circle';
			case 'STARVATION':
				return 'pi pi-clock';
			case 'EXTERNAL_BOTTLENECK':
				return 'pi pi-database';
			case 'OVERLOAD':
				return 'pi pi-exclamation-triangle';
			default:
				return 'pi pi-info-circle';
		}
	});

	readonly showTelemetryWarning = computed(() =>
		isProbableTelemetryFailure(this.snapshot()),
	);

	readonly heapMb = computed(() => {
		const snap = this.snapshot();
		return snap ? snap.gc.heapSizeBytes / (1024 * 1024) : 0;
	});

	readonly totalAllocatedMb = computed(() => {
		const snap = this.snapshot();
		return snap ? snap.gc.totalAllocatedBytes / (1024 * 1024) : 0;
	});

	readonly metricAlerts = computed(() => this.evaluateThresholds());

	readonly alertDetails = computed(() => {
		const alerts = this.metricAlerts();
		const details: Record<string, {
			level: AlertLevel;
			severity: 'success' | 'warn' | 'danger';
			recommendation: string | null;
			tabTarget: string | null;
		}> = {};
		for (const [key, level] of Object.entries(alerts)) {
			details[key] = {
				level,
				severity: level === 'critical' ? 'danger' : 'warn',
				recommendation: ALERT_RECOMMENDATIONS[key] ?? null,
				tabTarget: RECOMMENDATION_TAB_TARGETS[key] ?? null,
			};
		}
		return details;
	});
	// #endregion

	// #region Event handlers
	onRefreshClick(): void {
		this.refresh.emit();
	}

	onAutoRefreshChange(value: boolean): void {
		this.autoRefreshChange.emit(value);
	}

	onCollapsedToggle(): void {
		this.collapsedChange.emit(!this.collapsed());
	}

	onForceGc(): void {
		this.forceGc.emit();
	}

	onRecommendationClick(metricKey: string): void {
		const tab = RECOMMENDATION_TAB_TARGETS[metricKey];
		if (tab) this.navigateTab.emit(tab);
	}
	// #endregion

	// #region Threshold evaluation
	private evaluateThresholds(): Record<string, AlertLevel> {
		const snap = this.snapshot();
		const thresholdList = this.thresholds();
		if (!snap || !Array.isArray(thresholdList) || thresholdList.length === 0) return {};

		const metricsMap: Record<string, number> = {
			'requests.p95': snap.requests.p95Ms,
			'requests.p99': snap.requests.p99Ms,
			'threadPool.queueLength': snap.threadPool.queueLength,
			'db.activeConnections': snap.db.activeConnections,
			'gc.heapMb': this.heapMb(),
			'db.p95LatencyMs': snap.db.p95LatencyMs,
		};

		const result: Record<string, AlertLevel> = {};
		for (const t of thresholdList) {
			const value = metricsMap[t.metricKey];
			if (value === undefined) continue;

			const breachesCritical = t.direction === 'Above'
				? value >= t.criticalValue
				: value <= t.criticalValue;
			const breachesWarn = t.direction === 'Above'
				? value >= t.warnValue
				: value <= t.warnValue;

			if (breachesCritical) result[t.metricKey] = 'critical';
			else if (breachesWarn) result[t.metricKey] = 'warn';
		}
		return result;
	}
	// #endregion
}
