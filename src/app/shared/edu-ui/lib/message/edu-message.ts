import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduMessageSeverity = 'info' | 'success' | 'warn' | 'error' | 'secondary' | 'contrast';

@Component({
	selector: 'edu-message',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-message" [attr.data-severity]="severity()" role="alert">
			{{ text() }}
			<ng-content></ng-content>
		</div>
	`,
	styles: `
		.edu-message {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 0.75rem;
			border: 1px solid transparent;
			border-radius: var(--eduui-content-border-radius);
			font-size: 1rem;
		}

		.edu-message[data-severity='info'] { background: color-mix(in srgb, var(--eduui-sky-50), transparent 5%); border-color: var(--eduui-sky-200); color: var(--eduui-sky-600); }
		.edu-message[data-severity='success'] { background: color-mix(in srgb, var(--eduui-green-50), transparent 5%); border-color: var(--eduui-green-200); color: var(--eduui-green-600); }
		.edu-message[data-severity='warn'] { background: color-mix(in srgb, var(--eduui-yellow-50), transparent 5%); border-color: var(--eduui-yellow-200); color: var(--eduui-yellow-600); }
		.edu-message[data-severity='error'] { background: color-mix(in srgb, var(--eduui-red-50), transparent 5%); border-color: var(--eduui-red-200); color: var(--eduui-red-600); }
		.edu-message[data-severity='secondary'] { background: var(--eduui-surface-100); border-color: var(--eduui-surface-200); color: var(--eduui-surface-600); }
		.edu-message[data-severity='contrast'] { background: var(--eduui-surface-900); border-color: var(--eduui-surface-950); color: var(--eduui-surface-50); }

		:host-context(.dark-mode) {
			.edu-message[data-severity='info'] { background: color-mix(in srgb, var(--eduui-sky-500), transparent 84%); border-color: color-mix(in srgb, var(--eduui-sky-700), transparent 64%); color: var(--eduui-sky-500); }
			.edu-message[data-severity='success'] { background: color-mix(in srgb, var(--eduui-green-500), transparent 84%); border-color: color-mix(in srgb, var(--eduui-green-700), transparent 64%); color: var(--eduui-green-500); }
			.edu-message[data-severity='warn'] { background: color-mix(in srgb, var(--eduui-yellow-500), transparent 84%); border-color: color-mix(in srgb, var(--eduui-yellow-700), transparent 64%); color: var(--eduui-yellow-500); }
			.edu-message[data-severity='error'] { background: color-mix(in srgb, var(--eduui-red-500), transparent 84%); border-color: color-mix(in srgb, var(--eduui-red-700), transparent 64%); color: var(--eduui-red-500); }
			.edu-message[data-severity='secondary'] { background: var(--eduui-surface-800); border-color: var(--eduui-surface-700); color: var(--eduui-surface-300); }
			.edu-message[data-severity='contrast'] { background: var(--eduui-surface-0); border-color: var(--eduui-surface-100); color: var(--eduui-surface-950); }
		}
	`,
})
export class EduMessage {
	readonly text = input<string>();
	readonly severity = input<EduMessageSeverity>('info');
}
