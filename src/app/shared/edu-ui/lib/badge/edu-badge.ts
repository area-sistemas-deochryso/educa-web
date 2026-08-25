import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduBadgeSeverity = 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';

@Component({
	selector: 'edu-badge',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<span class="edu-badge" [attr.data-severity]="severity()">{{ value() }}</span>`,
	styles: `
		.edu-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 1.5rem;
			height: 1.5rem;
			padding: 0 0.5rem;
			border-radius: var(--eduui-radius-md);
			font-size: 0.75rem;
			font-weight: 700;
			line-height: 1;
		}

		.edu-badge[data-severity='primary'] { background: var(--eduui-primary-color); color: var(--eduui-primary-contrast-color); }
		.edu-badge[data-severity='secondary'] { background: var(--eduui-surface-100); color: var(--eduui-surface-600); }
		.edu-badge[data-severity='success'] { background: var(--eduui-green-500); color: var(--eduui-surface-0); }
		.edu-badge[data-severity='info'] { background: var(--eduui-sky-500); color: var(--eduui-surface-0); }
		.edu-badge[data-severity='warn'] { background: var(--eduui-orange-500); color: var(--eduui-surface-0); }
		.edu-badge[data-severity='danger'] { background: var(--eduui-red-500); color: var(--eduui-surface-0); }
		.edu-badge[data-severity='contrast'] { background: var(--eduui-surface-950); color: var(--eduui-surface-0); }

		:host-context(.dark-mode) {
			.edu-badge[data-severity='secondary'] { background: var(--eduui-surface-800); color: var(--eduui-surface-300); }
			.edu-badge[data-severity='success'] { background: var(--eduui-green-400); color: var(--eduui-green-950); }
			.edu-badge[data-severity='info'] { background: var(--eduui-sky-400); color: var(--eduui-sky-950); }
			.edu-badge[data-severity='warn'] { background: var(--eduui-orange-400); color: var(--eduui-orange-950); }
			.edu-badge[data-severity='danger'] { background: var(--eduui-red-400); color: var(--eduui-red-950); }
			.edu-badge[data-severity='contrast'] { background: var(--eduui-surface-0); color: var(--eduui-surface-950); }
		}
	`,
})
export class EduBadge {
	readonly value = input<string | number>();
	readonly severity = input<EduBadgeSeverity>('primary');
}
