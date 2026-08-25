import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EduAccordionService } from './edu-accordion.service';

@Component({
	selector: 'edu-accordion-panel',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-accordion-panel" [class.edu-accordion-panel--expanded]="expanded()">
			<ng-content select="edu-accordion-header"></ng-content>
			@if (expanded()) {
				<div class="edu-accordion-panel__content" role="region">
					<ng-content></ng-content>
				</div>
			}
		</div>
	`,
	styleUrl: './edu-accordion-panel.scss',
})
export class EduAccordionPanel {
	readonly value = input.required<string>();

	private readonly service = inject(EduAccordionService);

	readonly expanded = computed(() => this.service.isExpanded(this.value()));

	toggle(): void {
		this.service.toggle(this.value());
	}
}
