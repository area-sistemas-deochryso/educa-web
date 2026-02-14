// #region Imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-about',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './about.html',
	styleUrl: './about.scss',
})
export class AboutComponent {
	// * About page static content.
}
// #endregion
