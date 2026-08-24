import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { EduTabsService } from './edu-tabs.service';

@Component({
	selector: 'edu-tabs',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [EduTabsService],
	template: `
		<div class="edu-tabs">
			<div class="edu-tabs__list" role="tablist">
				<ng-content select="edu-tab"></ng-content>
			</div>
			<ng-content select="edu-tabpanel"></ng-content>
		</div>
	`,
	styleUrl: './edu-tabs.scss',
})
export class EduTabs {
	readonly value = input<string>();
	readonly valueChange = output<string>();

	private readonly service = inject(EduTabsService);

	constructor() {
		effect(() => {
			const v = this.value();
			if (v !== undefined) {
				this.service.active.set(v);
			}
		});
		this.service.activeChange.subscribe((v) => this.valueChange.emit(v));
	}
}
