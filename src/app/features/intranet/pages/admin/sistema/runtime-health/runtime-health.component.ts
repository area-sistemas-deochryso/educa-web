import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';

import { RuntimeHealthHistoryComponent } from './components/runtime-health-history/runtime-health-history.component';
import { RuntimeHealthWidgetComponent } from './components/runtime-health-widget/runtime-health-widget.component';
import { HistoryTimeRange } from './models/runtime-health.models';
import { RuntimeHealthFacade } from './services/runtime-health.facade';

@Component({
	selector: 'app-runtime-health-page',
	standalone: true,
	imports: [PageHeaderComponent, RuntimeHealthWidgetComponent, RuntimeHealthHistoryComponent],
	templateUrl: './runtime-health.component.html',
	styleUrl: './runtime-health.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthPageComponent implements OnInit {
	private readonly facade = inject(RuntimeHealthFacade);

	readonly vm = this.facade.vm;
	readonly historyVm = this.facade.historyVm;

	ngOnInit(): void {
		this.facade.init();
		this.facade.loadHistory();
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
}
