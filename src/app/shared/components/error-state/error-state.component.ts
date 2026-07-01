import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
	selector: 'app-error-state',
	standalone: true,
	imports: [ButtonModule],
	template: `
		<div class="error-state">
			<i class="pi pi-exclamation-triangle error-state__icon"></i>
			<p class="error-state__message">{{ message() }}</p>
			<p-button
				label="Reintentar"
				icon="pi pi-refresh"
				[outlined]="true"
				severity="danger"
				(onClick)="retry.emit()"
			/>
		</div>
	`,
	styles: `
		.error-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 1rem;
			padding: 2rem;
			text-align: center;

			&__icon {
				font-size: 2.5rem;
				color: var(--red-500);
			}

			&__message {
				color: var(--text-color-secondary);
				margin: 0;
				max-width: 400px;
			}
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
	readonly message = input('Ocurrió un error al cargar los datos.');
	readonly retry = output();
}
