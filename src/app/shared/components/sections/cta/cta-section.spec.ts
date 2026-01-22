import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../../test-setup';
import { CtaSectionComponent } from './cta-section';

describe('CtaSectionComponent', () => {
	let component: CtaSectionComponent;
	let fixture: ComponentFixture<CtaSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CtaSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(CtaSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
