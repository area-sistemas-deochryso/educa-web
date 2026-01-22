import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { CalendaryComponent } from './calendary.component';

describe('CalendaryComponent', () => {
	let component: CalendaryComponent;
	let fixture: ComponentFixture<CalendaryComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CalendaryComponent],
			providers: testProviders,
		}).compileComponents();

		fixture = TestBed.createComponent(CalendaryComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render without errors', () => {
		expect(fixture.nativeElement).toBeTruthy();
	});

	it('should initialize with current year', () => {
		const currentYear = new Date().getFullYear();
		expect(component.currentYear()).toBe(currentYear);
	});

	it('should generate 12 months in calendar', () => {
		expect(component.calendar().length).toBe(12);
	});

	it('should have modal closed initially', () => {
		expect(component.showModal()).toBe(false);
		expect(component.modalData()).toBeNull();
	});

	it('should change year when onGoToYear is called', () => {
		const newYear = 2025;
		component.onGoToYear(newYear);
		expect(component.currentYear()).toBe(newYear);
	});

	it('should close modal when onCloseModal is called', () => {
		component.showModal.set(true);
		component.onCloseModal();
		expect(component.showModal()).toBe(false);
		expect(component.modalData()).toBeNull();
	});
});
