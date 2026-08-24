import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EduTabsService, type EduTabValue } from './edu-tabs.service';

@Component({
	selector: 'edu-tabpanel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (active()) {
			<div class="edu-tabpanel" role="tabpanel">
				<ng-content></ng-content>
			</div>
		}
	`,
	styleUrl: './edu-tabpanel.scss',
})
export class EduTabPanel {
	readonly value = input.required<EduTabValue>();

	private readonly service = inject(EduTabsService);

	protected readonly active = computed(() => this.service.active() === this.value());
}
