import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, inject, input } from '@angular/core';
import { EduStepperService, EduStepValue } from './edu-stepper.service';

@Component({
	selector: 'edu-step-panel',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (active()) {
			<div class="edu-step-panel" role="tabpanel">
				<ng-container [ngTemplateOutlet]="contentTemplate() ?? null"></ng-container>
			</div>
		}
	`,
	styleUrl: './edu-step-panel.scss',
})
export class EduStepPanel {
	readonly value = input.required<EduStepValue>();

	private readonly service = inject(EduStepperService);
	protected readonly contentTemplate = contentChild<TemplateRef<unknown>>('content');

	protected readonly active = computed(() => this.service.active() === this.value());
}
