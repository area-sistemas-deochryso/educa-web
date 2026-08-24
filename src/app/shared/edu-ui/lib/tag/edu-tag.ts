import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduTagSeverity = 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';

@Component({
	selector: 'edu-tag',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<span class="edu-tag" [class.edu-tag--rounded]="rounded()" [attr.data-severity]="severity()">
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
}
