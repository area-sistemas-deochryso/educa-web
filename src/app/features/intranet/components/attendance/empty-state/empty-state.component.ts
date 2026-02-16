// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Componente presentacional (Dumb) para estados vacíos.
 * Muestra un mensaje cuando no hay datos disponibles.
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-empty-state',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './empty-state.component.html',
	styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
	// * Message to render when no data is available.
	message = input.required<string>();
}
// #endregion
