import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export type EduMessageSeverity = 'info' | 'success' | 'warn' | 'error' | 'secondary' | 'contrast';

@Component({
	selector: 'edu-message',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (visible()) {
			<div class="edu-message" [class]="styleClass()" [attr.data-severity]="severity()" role="alert">
				{{ text() }}
				<ng-content></ng-content>
				@if (closable()) {
					<button type="button" class="edu-message__close" (click)="close()" aria-label="Cerrar">
						<i class="pi pi-times"></i>
					</button>
				}
			</div>
		}
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

		.edu-message__close {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			margin-left: auto;
			padding: 0.125rem;
			border: none;
			background: transparent;
			color: inherit;
			cursor: pointer;
			border-radius: var(--eduui-content-border-radius);
			opacity: 0.7;
		}

		.edu-message__close:hover {
			opacity: 1;
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
	readonly closable = input(false);
	readonly styleClass = input('');
	readonly onClose = output<void>();

	/** Controla la visibilidad interna del mensaje; el cierre por click es la fuente de verdad por default. */
	protected readonly visible = signal(true);

	protected close(): void {
		this.visible.set(false);
		this.onClose.emit();
	}
}
