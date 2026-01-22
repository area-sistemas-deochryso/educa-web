import { Component } from '@angular/core';
import { HeroSectionComponent } from '@shared/components/sections/hero';
import { AboutSectionComponent } from '@shared/components/sections/about';
import { CoursesSectionComponent } from '@shared/components/sections/courses';
import { CounterSectionComponent } from '@shared/components/sections/counter';
import { TestimonialsSectionComponent } from '@shared/components/sections/testimonials';
import { CtaSectionComponent } from '@shared/components/sections/cta';

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
export class HomeComponent {}
