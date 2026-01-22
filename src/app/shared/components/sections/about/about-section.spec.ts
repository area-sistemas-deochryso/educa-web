import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { AboutSectionComponent } from './about-section';

describe('AboutSectionComponent', () => {
	let component: AboutSectionComponent;
	let fixture: ComponentFixture<AboutSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AboutSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(AboutSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
