import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { EduAccordionService } from './edu-accordion.service';

@Component({
	selector: 'edu-accordion',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [EduAccordionService],
	template: ` <div class="edu-accordion"><ng-content></ng-content></div> `,
	styleUrl: './edu-accordion.scss',
})
export class EduAccordion {
	readonly multiple = input(false);
	readonly value = input<string | string[]>();
	readonly valueChange = output<string | string[]>();

	private readonly service = inject(EduAccordionService);

	constructor() {
		effect(() => this.service.multiple.set(this.multiple()));

		effect(() => {
			const v = this.value();
			if (v !== undefined) {
				this.service.expanded.set(Array.isArray(v) ? v : [v]);
			}
		});

		this.service.expandedChange.subscribe((next) => {
			this.valueChange.emit(this.multiple() ? next : (next[0] ?? ''));
		});
	}
}
