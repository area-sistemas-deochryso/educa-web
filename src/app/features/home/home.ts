import { Component } from '@angular/core';
import { HeroSectionComponent } from './components/hero-section';
import { AboutSectionComponent } from './components/about-section';
import { CoursesSectionComponent } from './components/courses-section';
import { CounterSectionComponent } from './components/counter-section';
import { TestimonialsSectionComponent } from './components/testimonials-section';
import { CtaSectionComponent } from './components/cta-section';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroSectionComponent,
    AboutSectionComponent,
    CoursesSectionComponent,
    CounterSectionComponent,
    TestimonialsSectionComponent,
    CtaSectionComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {}
