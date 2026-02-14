// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { PrimariaComponent } from './primaria';

// #endregion
// #region Implementation
describe('PrimariaComponent', () => {
	let component: PrimariaComponent;
	let fixture: ComponentFixture<PrimariaComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PrimariaComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(PrimariaComponent);
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
