import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { FaqComponent } from './faq';

describe('FaqComponent', () => {
	let component: FaqComponent;
	let fixture: ComponentFixture<FaqComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FaqComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(FaqComponent);
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
