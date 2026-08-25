// #region Imports
import { Component } from '@angular/core';
import { EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-about-section',
	standalone: true,
	imports: [EduTooltip],
	templateUrl: './about-section.html',
	styleUrl: './about-section.scss',
})
export class AboutSectionComponent {
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
