// #region Imports
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-faq',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './faq.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './faq.scss',
})
export class FaqComponent {
	// * FAQ page static content.
}
// #endregion
