import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';

import { RuntimeHealthWidgetComponent } from './components/runtime-health-widget/runtime-health-widget.component';
import { RuntimeHealthFacade } from './services/runtime-health.facade';

@Component({
	selector: 'app-runtime-health-page',
	standalone: true,
	imports: [PageHeaderComponent, RuntimeHealthWidgetComponent],
	templateUrl: './runtime-health.component.html',
	styleUrl: './runtime-health.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHealthPageComponent implements OnInit {
	private readonly facade = inject(RuntimeHealthFacade);

	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.init();
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
}
