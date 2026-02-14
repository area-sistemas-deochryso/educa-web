// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { CoursesSectionComponent } from './courses-section';

// #endregion
// #region Implementation
describe('CoursesSectionComponent', () => {
	let component: CoursesSectionComponent;
	let fixture: ComponentFixture<CoursesSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CoursesSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(CoursesSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
// #endregion
