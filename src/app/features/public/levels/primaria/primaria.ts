// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-primaria',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './primaria.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './primaria.scss',
})
export class PrimariaComponent {
	// * Primaria level page content.
}
// #endregion
