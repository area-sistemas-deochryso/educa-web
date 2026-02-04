import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Tooltip } from 'primeng/tooltip';
import { logger } from '@core/helpers';

@Component({
	selector: 'app-footer',
	standalone: true,
	imports: [RouterLink, FormsModule, Tooltip],
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
