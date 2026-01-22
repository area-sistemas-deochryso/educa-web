import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { TestimonialsSectionComponent } from './testimonials-section';

describe('TestimonialsSectionComponent', () => {
	let component: TestimonialsSectionComponent;
	let fixture: ComponentFixture<TestimonialsSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TestimonialsSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(TestimonialsSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
