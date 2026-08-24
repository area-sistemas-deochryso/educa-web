// #region Imports
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { logger } from '@core/helpers';
import { EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-footer',
	standalone: true,
	imports: [RouterLink, FormsModule, EduTooltip],
	templateUrl: './footer.html',
	styleUrl: './footer.scss',
})
export class FooterComponent {
	// * Local form state for newsletter input.
	newsletterEmail = '';

	onNewsletterSubmit(): void {
		// * Placeholder submit handler (logs and clears).
		if (this.newsletterEmail) {
			logger.log('Newsletter subscription:', this.newsletterEmail);
			this.newsletterEmail = '';
		}
	}

	scrollToTop(): void {
		// * Smooth scroll back to the top of the page.
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}
// #endregion
