import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Componente presentacional (Dumb) para estados vacíos.
 * Muestra un mensaje cuando no hay datos disponibles.
 */
@Component({
	selector: 'app-empty-state',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="no-data">
			<p>{{ message() }}</p>
		</div>
	`,
	styles: [
		`
			.no-data {
				display: flex;
				justify-content: center;
				align-items: center;
				padding: 2rem;
				background: var(--surface-card);
				border-radius: var(--border-radius);
				margin: 1rem 0;

				p {
					color: var(--text-color-secondary);
					font-size: 1rem;
					margin: 0;
				}
			}
		`,
	],
})
export class EmptyStateComponent {
	message = input.required<string>();
}
