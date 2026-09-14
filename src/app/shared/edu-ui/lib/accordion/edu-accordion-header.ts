import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EduAccordionPanel } from './edu-accordion-panel';

@Component({
	selector: 'edu-accordion-header',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			type="button"
			class="edu-accordion-header"
			[attr.id]="headerId()"
			[attr.aria-expanded]="expanded()"
			[attr.aria-controls]="panelId()"
			(click)="panel.toggle()"
		>
			<ng-content></ng-content>
			<i class="edu-accordion-header__icon" [class.edu-accordion-header__icon--expanded]="expanded()"></i>
		</button>
	`,
	styleUrl: './edu-accordion-header.scss',
})
export class EduAccordionHeader {
	protected readonly panel = inject(EduAccordionPanel);

	protected readonly expanded = computed(() => this.panel.expanded());

	protected headerId(): string {
		return this.panel.headerId();
	}

	protected panelId(): string {
		return this.panel.panelId();
	}
}
