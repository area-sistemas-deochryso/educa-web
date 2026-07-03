import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';

import { ActiveBlockingTableComponent } from './components/active-blocking-table/active-blocking-table.component';
import { IdentityValuesProgressComponent } from './components/identity-values-progress/identity-values-progress.component';
import { IndexFragmentationTableComponent } from './components/index-fragmentation-table/index-fragmentation-table.component';
import { MissingIndexesTableComponent } from './components/missing-indexes-table/missing-indexes-table.component';
import { ResourceStatsChartComponent } from './components/resource-stats-chart/resource-stats-chart.component';
import { StorageGaugesComponent } from './components/storage-gauges/storage-gauges.component';
import { TableSizesTableComponent } from './components/table-sizes-table/table-sizes-table.component';
import { TopQueriesTableComponent } from './components/top-queries-table/top-queries-table.component';
import { UnusedIndexesTableComponent } from './components/unused-indexes-table/unused-indexes-table.component';
import { DiagnosticoDbFacade } from './services/diagnostico-db.facade';

@Component({
	selector: 'app-diagnostico-db-page',
	standalone: true,
	imports: [
		Tabs,
		TabList,
		Tab,
		TabPanel,
		PageHeaderComponent,
		ResourceStatsChartComponent,
		TopQueriesTableComponent,
		ActiveBlockingTableComponent,
		StorageGaugesComponent,
		TableSizesTableComponent,
		MissingIndexesTableComponent,
		IndexFragmentationTableComponent,
		UnusedIndexesTableComponent,
		IdentityValuesProgressComponent,
	],
	templateUrl: './diagnostico-db.component.html',
	styleUrl: './diagnostico-db.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticoDbPageComponent implements OnInit {
	private readonly facade = inject(DiagnosticoDbFacade);

	readonly resourceStatsVm = this.facade.resourceStatsVm;
	readonly topQueriesVm = this.facade.topQueriesVm;
	readonly activeBlockingVm = this.facade.activeBlockingVm;
	readonly storageVm = this.facade.storageVm;
	readonly tableSizesVm = this.facade.tableSizesVm;
	readonly missingIndexesVm = this.facade.missingIndexesVm;
	readonly indexFragmentationVm = this.facade.indexFragmentationVm;
	readonly unusedIndexesVm = this.facade.unusedIndexesVm;
	readonly identityValuesVm = this.facade.identityValuesVm;

	readonly activeTab = signal('resource-stats');

	ngOnInit(): void {
		this.facade.init();
	}

	onResourceStatsRefresh(): void {
		this.facade.loadResourceStats();
	}

	onTopQueriesRefresh(): void {
		this.facade.loadTopQueries();
	}

	onActiveBlockingRefresh(): void {
		this.facade.loadActiveBlocking();
	}

	onStorageRefresh(): void {
		this.facade.loadStorage();
	}

	onTableSizesRefresh(): void {
		this.facade.loadTableSizes();
	}

	onMissingIndexesRefresh(): void {
		this.facade.loadMissingIndexes();
	}

	onIndexFragmentationRefresh(): void {
		this.facade.loadIndexFragmentation();
	}

	onUnusedIndexesRefresh(): void {
		this.facade.loadUnusedIndexes();
	}

	onIdentityValuesRefresh(): void {
		this.facade.loadIdentityValues();
	}
}
