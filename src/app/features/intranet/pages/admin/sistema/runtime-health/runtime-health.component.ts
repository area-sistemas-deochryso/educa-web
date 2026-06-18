import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { BadgeModule } from 'primeng/badge';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';

import { AlertTimelineComponent } from './components/alert-timeline/alert-timeline.component';
import { RuntimeHealthHistoryComponent } from './components/runtime-health-history/runtime-health-history.component';
import { RuntimeHealthWidgetComponent } from './components/runtime-health-widget/runtime-health-widget.component';
import { SlowRequestsTableComponent } from './components/slow-requests-table/slow-requests-table.component';
import { ThresholdConfigComponent } from './components/threshold-config/threshold-config.component';
import { HistoryTimeRange, ThresholdConfig } from './models/runtime-health.models';
import { RuntimeHealthFacade } from './services/runtime-health.facade';

@Component({
	selector: 'app-runtime-health-page',
	standalone: true,
	imports: [
		DecimalPipe,
		BadgeModule,
		Tabs,
		TabList,
		Tab,
		TabPanels,
		TabPanel,
		PageHeaderComponent,
		RuntimeHealthWidgetComponent,
		RuntimeHealthHistoryComponent,
		AlertTimelineComponent,
		SlowRequestsTableComponent,
		ThresholdConfigComponent,
	],
	templateUrl: './runtime-health.component.html',
	styleUrl: './runtime-health.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthPageComponent implements OnInit {
	private readonly facade = inject(RuntimeHealthFacade);

	readonly vm = this.facade.vm;
	readonly historyVm = this.facade.historyVm;
	readonly alertsVm = this.facade.alertsVm;
	readonly thresholdsVm = this.facade.thresholdsVm;
	readonly diagnosticsVm = this.facade.diagnosticsVm;
	readonly thresholds = this.facade.thresholds;

	ngOnInit(): void {
		this.facade.init();
		this.facade.loadHistory();
		this.facade.loadAlerts();
		this.facade.loadThresholds();
		this.facade.loadSlowRequests();
	}

	onRefresh(): void {
		this.facade.load();
	}

	onAutoRefreshChange(value: boolean): void {
		this.facade.setAutoRefresh(value);
	}

	onCollapsedChange(value: boolean): void {
		this.facade.setCollapsed(value);
	}

	onTimeRangeChange(range: HistoryTimeRange): void {
		this.facade.setTimeRange(range);
	}

	onHistoryRefresh(): void {
		this.facade.loadHistory();
	}

	onAlertsRefresh(): void {
		this.facade.loadAlerts();
	}

	onThresholdsSave(thresholds: ThresholdConfig[]): void {
		this.facade.saveThresholds(thresholds);
	}

	onForceGc(): void {
		this.facade.forceGc();
	}

	onSlowRequestsRefresh(): void {
		this.facade.loadSlowRequests();
	}
}
