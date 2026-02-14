// #region Imports
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { InicialComponent } from './inicial';

// #endregion
// #region Implementation
describe('InicialComponent', () => {
	let component: InicialComponent;
	let fixture: ComponentFixture<InicialComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [InicialComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(InicialComponent);
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
