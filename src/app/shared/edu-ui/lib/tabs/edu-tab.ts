import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EduTabsService } from './edu-tabs.service';

@Component({
	selector: 'edu-tab',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			type="button"
			role="tab"
			class="edu-tab"
			[attr.aria-selected]="active()"
			[class.edu-tab--active]="active()"
			[disabled]="disabled()"
			(click)="select()"
		>
			<ng-content></ng-content>
		</button>
	`,
	styleUrl: './edu-tab.scss',
})
export class EduTab {
	readonly value = input.required<string>();
	readonly disabled = input(false);

	private readonly service = inject(EduTabsService);

	protected readonly active = computed(() => this.service.active() === this.value());

	protected select(): void {
		if (!this.disabled()) {
			this.service.select(this.value());
		}
	}
}
