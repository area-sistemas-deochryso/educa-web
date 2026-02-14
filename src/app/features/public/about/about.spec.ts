// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { AboutComponent } from './about';

// #endregion
// #region Implementation
describe('AboutComponent', () => {
	let component: AboutComponent;
	let fixture: ComponentFixture<AboutComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AboutComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(AboutComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render without errors', () => {
		expect(fixture.nativeElement).toBeTruthy();
	});
});
// #endregion
