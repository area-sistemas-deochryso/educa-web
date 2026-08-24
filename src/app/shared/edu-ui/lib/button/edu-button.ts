import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduButtonSeverity =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'info'
	| 'warn'
	| 'danger'
	| 'help'
	| 'contrast';

export type EduButtonSize = 'small' | 'large';

@Component({
	selector: 'edu-button',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			class="edu-button"
			type="button"
			[disabled]="disabled()"
			[attr.data-severity]="severity()"
			[class.edu-button--text]="text()"
			[class.edu-button--outlined]="outlined()"
			[class.edu-button--rounded]="rounded()"
			[class.edu-button--sm]="size() === 'small'"
			[class.edu-button--lg]="size() === 'large'"
			[class.edu-button--icon-only]="!!icon() && !label()"
		>
			@if (icon()) {
				<i class="edu-button__icon" [class]="icon()"></i>
			}
			@if (label()) {
				<span class="edu-button__label">{{ label() }}</span>
			}
			<ng-content></ng-content>
		</button>
	`,
	styleUrl: './edu-button.scss',
})
export class EduButton {
	readonly label = input<string>();
	readonly icon = input<string>();
	readonly severity = input<EduButtonSeverity>('primary');
	readonly size = input<EduButtonSize>();
	readonly text = input(false);
	readonly rounded = input(false);
	readonly outlined = input(false);
	readonly disabled = input(false);
}
