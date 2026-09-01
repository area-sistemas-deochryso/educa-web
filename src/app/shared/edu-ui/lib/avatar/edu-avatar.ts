import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduAvatarSize = 'normal' | 'large' | 'xlarge';
export type EduAvatarShape = 'square' | 'circle';
export type EduAvatarVariant = 'neutral' | 'brand';

@Component({
	selector: 'edu-avatar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div
			class="edu-avatar"
			[class.edu-avatar--lg]="size() === 'large'"
			[class.edu-avatar--xl]="size() === 'xlarge'"
			[class.edu-avatar--circle]="shape() === 'circle'"
			[attr.data-variant]="variant()"
		>
			@if (icon()) {
				<i [class]="icon()"></i>
			} @else if (label()) {
				{{ label() }}
			} @else {
				<ng-content></ng-content>
			}
		</div>
	`,
	styleUrl: './edu-avatar.scss',
})
export class EduAvatar {
	readonly label = input<string>();
	readonly icon = input<string>();
	readonly size = input<EduAvatarSize>('normal');
	readonly shape = input<EduAvatarShape>('square');
	readonly variant = input<EduAvatarVariant>('neutral');
}
