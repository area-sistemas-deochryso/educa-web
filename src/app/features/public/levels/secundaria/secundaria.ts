// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-secundaria',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './secundaria.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './secundaria.scss',
})
export class SecundariaComponent {
	// * Secundaria level page content.
}
// #endregion
