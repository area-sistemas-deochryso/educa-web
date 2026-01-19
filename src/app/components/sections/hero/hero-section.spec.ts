import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../../test-setup';
import { HeroSectionComponent } from './hero-section';

describe('HeroSectionComponent', () => {
	let component: HeroSectionComponent;
	let fixture: ComponentFixture<HeroSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HeroSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(HeroSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
