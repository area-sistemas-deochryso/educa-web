import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';

import { EmailOutboxDataFacade, EmailOutboxUiFacade } from './services';
import { EmailOutboxHeaderComponent } from './components/email-outbox-header/email-outbox-header.component';
import { EmailOutboxStatsComponent } from './components/email-outbox-stats/email-outbox-stats.component';
import { EmailOutboxFiltersComponent } from './components/email-outbox-filters/email-outbox-filters.component';
import { EmailOutboxTableComponent } from './components/email-outbox-table/email-outbox-table.component';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

@Component({
	selector: 'app-email-outbox',
	standalone: true,
	imports: [
		DrawerModule,
		StatsSkeletonComponent,
		TableSkeletonComponent,
		EmailOutboxHeaderComponent,
		EmailOutboxStatsComponent,
		EmailOutboxFiltersComponent,
		EmailOutboxTableComponent,
	],
	templateUrl: './email-outbox.component.html',
	styleUrl: './email-outbox.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxComponent {
	// #region Dependencias
	private dataFacade = inject(EmailOutboxDataFacade);
	private uiFacade = inject(EmailOutboxUiFacade);
	// #endregion

	// #region Estado
	readonly vm = this.dataFacade.vm;
	readonly tableSkeletonColumns = EmailOutboxTableComponent.skeletonColumns;
	// #endregion

	// #region Lifecycle
	constructor() {
		this.dataFacade.loadData();
	}
	// #endregion

	// #region Event handlers
	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterTipoChange(tipo: string | null): void {
		this.dataFacade.onFilterTipoChange(tipo);
	}

	onFilterEstadoChange(estado: string | null): void {
		this.dataFacade.onFilterEstadoChange(estado);
	}

	onFilterDesdeChange(desde: string | null): void {
		this.dataFacade.onFilterDesdeChange(desde);
	}

	onFilterHastaChange(hasta: string | null): void {
		this.dataFacade.onFilterHastaChange(hasta);
	}

	onViewDetail(item: EmailOutboxLista): void {
		this.uiFacade.openDetail(item);
	}

	onRetry(item: EmailOutboxLista): void {
		this.uiFacade.reintentar(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeDrawer();
		}
	}
	// #endregion
}
