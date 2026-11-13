import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fila «etiqueta / valor» dentro de una card de `app-mobile-card-list`. El valor es el contenido proyectado. */
@Component({
	selector: 'app-card-row',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<span class="card-row__label">{{ label() }}</span>
		<span class="card-row__value"><ng-content /></span>
	`,
	styles: `
		:host {
			display: grid;
			grid-template-columns: 5.25rem minmax(0, 1fr);
			align-items: start;
			gap: 0.75rem;
			padding: 0.625rem 0;
			border-bottom: 1px solid var(--surface-200);
		}

		:host(:last-child) {
			border-bottom: 0;
		}

		.card-row__label {
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--faq-text-muted, var(--text-color-secondary));
		}

		.card-row__value {
			min-width: 0;
			overflow-wrap: anywhere;
			white-space: pre-wrap;
			color: var(--text-color);
		}
	`,
})
export class CardRowComponent {
	readonly label = input.required<string>();
}
