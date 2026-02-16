// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-welcome-section',
	standalone: true,
	imports: [],
	templateUrl: './welcome-section.html',
	styleUrl: './welcome-section.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeSectionComponent {
	// * PrimeNG icon to display.
	icon = input<string>('pi-graduation-cap');

	// * Main welcome title.
	title = input<string>('Bienvenido a tu Intranet');

	// * Supporting subtitle copy.
	subtitle = input<string>(
		'Aquí encontrarás toda la información relevante para tu día a día académico.',
	);
}
// #endregion
