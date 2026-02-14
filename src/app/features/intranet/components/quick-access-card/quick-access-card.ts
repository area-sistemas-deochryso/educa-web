// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-quick-access-card',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './quick-access-card.html',
	styleUrl: './quick-access-card.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAccessCardComponent {
	// * Visible label on the card.
	label = input.required<string>();

	// * Target route.
	path = input.required<string>();

	// * Optional modal query param for the target page.
	modal = input<string>();

	// * PrimeNG icon class.
	icon = input<string>('pi-link');

	readonly queryParams = computed(() => {
		// * Only include modal param when defined.
		const modalValue = this.modal();
		return modalValue ? { modal: modalValue } : null;
	});
}
// #endregion
