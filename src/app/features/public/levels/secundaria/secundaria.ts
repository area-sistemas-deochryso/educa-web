// #region Imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-secundaria',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './secundaria.html',
	styleUrl: './secundaria.scss',
})
export class SecundariaComponent {
	// * Secundaria level page content.
}
// #endregion
