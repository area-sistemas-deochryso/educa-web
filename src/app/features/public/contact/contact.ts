// #region Imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-contact',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './contact.html',
	styleUrl: './contact.scss',
})
export class ContactComponent {
	// * Contact page static content.
}
// #endregion
