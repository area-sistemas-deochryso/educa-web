// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
// #endregion

@Component({
	selector: 'app-hub-context-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="hub-banner" [attr.data-level]="level()">
			<div class="hub-banner-content">
				<i class="pi" [class.pi-exclamation-circle]="level() === 'critical'" [class.pi-exclamation-triangle]="level() === 'warn'" [class.pi-info-circle]="!level()"></i>
				<span>{{ message() }}</span>
			</div>
			<button type="button" class="hub-banner-action" (click)="clearFilter.emit()">
				<i class="pi pi-filter-slash"></i>
				Ver todo
			</button>
		</div>
	`,
	styles: `
		.hub-banner {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0.5rem 1rem;
			border-radius: 6px;
			margin-bottom: 1rem;
			font-size: 0.875rem;
			background: color-mix(in srgb, var(--blue-500) 10%, transparent);
			border: 1px solid color-mix(in srgb, var(--blue-500) 30%, transparent);
			color: var(--text-color);
		}

		:host .hub-banner[data-level='warn'] {
			background: color-mix(in srgb, var(--yellow-500) 10%, transparent);
			border-color: color-mix(in srgb, var(--yellow-500) 30%, transparent);
		}

		:host .hub-banner[data-level='critical'] {
			background: color-mix(in srgb, var(--red-500) 10%, transparent);
			border-color: color-mix(in srgb, var(--red-500) 30%, transparent);
		}

		.hub-banner-content {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		.hub-banner-action {
			background: none;
			border: 1px solid var(--surface-border);
			border-radius: 4px;
			padding: 0.25rem 0.75rem;
			cursor: pointer;
			font-size: 0.8125rem;
			color: var(--text-color-secondary);
			display: flex;
			align-items: center;
			gap: 0.375rem;
			transition: background 0.15s;

			&:hover {
				background: var(--surface-hover);
			}
		}
	`,
})
export class HubContextBannerComponent {
	readonly level = input<string | null>(null);
	readonly message = input.required<string>();
	readonly clearFilter = output<void>();
}
