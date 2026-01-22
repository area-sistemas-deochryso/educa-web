import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { TermsComponent } from './terms';

describe('TermsComponent', () => {
	let component: TermsComponent;
	let fixture: ComponentFixture<TermsComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TermsComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(TermsComponent);
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
