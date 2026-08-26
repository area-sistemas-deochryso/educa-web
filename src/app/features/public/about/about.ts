// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-about',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './about.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './about.scss',
})
export class AboutComponent {
	// * About page static content.
}
// #endregion
