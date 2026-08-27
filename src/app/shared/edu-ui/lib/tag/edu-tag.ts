import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

export type EduTagSeverity =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'info'
	| 'warn'
	| 'danger'
	| 'contrast';

@Component({
	selector: 'edu-tag',
	standalone: true,
	imports: [EduPtRoot],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<span
			class="edu-tag"
			[class.edu-tag--rounded]="rounded()"
			[class]="styleClass()"
			[attr.data-severity]="severity()"
			[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
		>
			@if (icon()) {
				<i class="edu-tag__icon" [class]="icon()"></i>
			}
			{{ value() }}
			<ng-content></ng-content>
		</span>
	`,
	styleUrl: './edu-tag.scss',
})
export class EduTag {
	readonly value = input<string>();
	readonly severity = input<EduTagSeverity>('primary');
	readonly rounded = input(false);
	readonly icon = input<string>();
	readonly styleClass = input('');
	readonly pt = input<EduPassThrough>();
}
