import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Última fila de una card: reparte los íconos de acción en partes iguales. Cada botón proyectado debe
 * llevar `aria-label` (un ícono solo no tiene nombre accesible) y mantiene un área táctil de 44 px.
 */
@Component({
	selector: 'app-card-actions',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content />`,
	styles: `
		:host {
			display: flex;
			justify-content: space-around;
			align-items: center;
			gap: 0.5rem;
			margin-top: 0.25rem;
			padding-top: 0.5rem;
			border-top: 1px solid var(--surface-200);
		}

		:host ::ng-deep button {
			min-width: 2.75rem;
			min-height: 2.75rem;
		}
	`,
})
export class CardActionsComponent {}
