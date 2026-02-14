// #region Imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-primaria',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './primaria.html',
	styleUrl: './primaria.scss',
})
export class PrimariaComponent {
	// * Primaria level page content.
}
// #endregion
