import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

export type EduButtonSeverity =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'info'
	| 'warn'
	| 'danger'
	| 'help'
	| 'contrast';

export type EduButtonSize = 'xs' | 'small' | 'large';
export type EduButtonIconPos = 'left' | 'right';
export type EduButtonType = 'button' | 'submit';

@Component({
	selector: 'edu-button',
	standalone: true,
	imports: [EduPtRoot],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			class="edu-button"
			[attr.type]="type()"
			[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
			[disabled]="disabled() || loading()"
			[attr.data-severity]="severity()"
			[attr.aria-busy]="loading()"
			[class.edu-button--text]="text()"
			[class.edu-button--outlined]="outlined()"
			[class.edu-button--rounded]="rounded()"
			[class.edu-button--xs]="size() === 'xs'"
			[class.edu-button--sm]="size() === 'small'"
			[class.edu-button--lg]="size() === 'large'"
			[class.edu-button--icon-only]="(!!icon() || loading()) && !label()"
		>
			@if (iconPos() === 'right') {
				@if (label()) {
					<span class="edu-button__label">{{ label() }}</span>
				}
				@if (loading()) {
					<i class="edu-button__icon pi pi-spinner pi-spin"></i>
				} @else if (icon()) {
					<i class="edu-button__icon" [class]="icon()"></i>
				}
			} @else {
				@if (loading()) {
					<i class="edu-button__icon pi pi-spinner pi-spin"></i>
				} @else if (icon()) {
					<i class="edu-button__icon" [class]="icon()"></i>
				}
				@if (label()) {
					<span class="edu-button__label">{{ label() }}</span>
				}
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
	readonly loading = input(false);
	readonly iconPos = input<EduButtonIconPos>('left');
	readonly type = input<EduButtonType>('button');
	readonly pt = input<EduPassThrough>();
}
