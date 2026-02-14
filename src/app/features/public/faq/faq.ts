// #region Imports
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-faq',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './faq.html',
	styleUrl: './faq.scss',
})
export class FaqComponent {
	// * FAQ page static content.
}
// #endregion
