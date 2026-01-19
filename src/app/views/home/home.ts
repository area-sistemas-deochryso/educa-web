import { Component } from '@angular/core';
import { HeroSectionComponent } from '../../components/sections/hero';
import { AboutSectionComponent } from '../../components/sections/about';
import { CoursesSectionComponent } from '../../components/sections/courses';
import { CounterSectionComponent } from '../../components/sections/counter';
import { TestimonialsSectionComponent } from '../../components/sections/testimonials';
import { CtaSectionComponent } from '../../components/sections/cta';

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
