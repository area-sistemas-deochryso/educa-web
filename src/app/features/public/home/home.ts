// #region Imports
import { Component } from '@angular/core';
import { AboutSectionComponent, CoursesSectionComponent, CounterSectionComponent, CtaSectionComponent, HeroSectionComponent, TestimonialsSectionComponent } from '@shared/components';

// #endregion
// #region Implementation
@Component({
	selector: 'app-home',
	standalone: true,
	imports: [
		HeroSectionComponent,
		AboutSectionComponent,
		CoursesSectionComponent,
		CounterSectionComponent,
		TestimonialsSectionComponent,
		CtaSectionComponent,
	],
	templateUrl: './home.html',
	styleUrl: './home.scss',
})
export class HomeComponent {
	// * Composes the public landing page sections.
}
// #endregion
