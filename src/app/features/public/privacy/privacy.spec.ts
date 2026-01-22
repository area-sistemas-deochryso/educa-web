import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { PrivacyComponent } from './privacy';

describe('PrivacyComponent', () => {
	let component: PrivacyComponent;
	let fixture: ComponentFixture<PrivacyComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PrivacyComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(PrivacyComponent);
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
