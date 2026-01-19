import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '../../../../test-setup';
import { CounterSectionComponent } from './counter-section';

describe('CounterSectionComponent', () => {
	let component: CounterSectionComponent;
	let fixture: ComponentFixture<CounterSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CounterSectionComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(CounterSectionComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
