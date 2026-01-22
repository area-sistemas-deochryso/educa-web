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
	newsletterEmail = '';

	onNewsletterSubmit(): void {
		if (this.newsletterEmail) {
			logger.log('Newsletter subscription:', this.newsletterEmail);
			this.newsletterEmail = '';
		}
	}

	scrollToTop(): void {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}
