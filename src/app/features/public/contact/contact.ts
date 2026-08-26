// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-contact',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './contact.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './contact.scss',
})
export class ContactComponent {
	// * Contact page static content.
}
// #endregion
