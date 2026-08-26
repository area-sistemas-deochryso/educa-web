// #region Imports
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
interface ContactForm {
	name: string;
	phone: string;
}

@Component({
	selector: 'app-hero-section',
	standalone: true,
	imports: [FormsModule, EduTooltip],
	templateUrl: './hero-section.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './hero-section.scss',
})
export class HeroSectionComponent {
	// * Detect changes after async fetch callbacks (outside template event flow).
	private cdr = inject(ChangeDetectorRef);

	// * Simple contact form state.
	formData: ContactForm = {
		name: '',
		phone: '',
	};

	// * Prevent double submit.
	isSubmitting = false;

	onSubmit(): void {
		// * Post to Formspree and reset on success.
		if (this.formData.name && this.formData.phone) {
			this.isSubmitting = true;

			// Simular envío a Formspree o backend
			const formspreeUrl = 'https://formspree.io/f/mzzprebk';

			fetch(formspreeUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(this.formData),
			})
				.then(() => {
					alert('¡Gracias por contactarnos! Nos comunicaremos contigo pronto.');
					this.formData = { name: '', phone: '' };
				})
				.catch(() => {
					alert('Hubo un error al enviar el formulario. Por favor, intenta de nuevo.');
				})
				.finally(() => {
					this.isSubmitting = false;
					// * OnPush: mark dirty since this runs outside the (ngSubmit) event flow.
					this.cdr.markForCheck();
				});
		}
	}

	scrollToSection(event: Event, sectionId: string): void {
		// * Smooth scroll with navbar offset.
		event.preventDefault();
		const element = document.getElementById(sectionId);
		if (element) {
			const navbarHeight = document.querySelector('.navbar')?.clientHeight || 0;
			const offsetTop = element.offsetTop - navbarHeight;
			window.scrollTo({ top: offsetTop, behavior: 'smooth' });
		}
	}
}
// #endregion
