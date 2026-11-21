// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { of } from 'rxjs';
import { CalendaryComponent } from './calendary.component';
import { EventsCalendarService } from '@features/intranet/pages/admin/events-calendar/services';

// #endregion
// #region Implementation
describe('CalendaryComponent', () => {
	let component: CalendaryComponent;
	let fixture: ComponentFixture<CalendaryComponent>;

	beforeEach(async () => {
		const eventosServiceMock = {
			getActivosPorAnio: vi.fn().mockReturnValue(of([])),
		};

		await TestBed.configureTestingModule({
			imports: [CalendaryComponent],
			providers: [
				...testProviders,
				{ provide: EventsCalendarService, useValue: eventosServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CalendaryComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render a single big month view plus the agenda', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('app-calendar-month-view').length).toBe(1);
		expect(fixture.nativeElement.querySelectorAll('app-calendar-agenda').length).toBe(1);
	});

	it('should open the current month by default', () => {
		expect(component.currentMonth()).toBe(new Date().getMonth());
	});

	it('should select a month and clear the selected day', () => {
		component.onDaySelect('2026-03-10');
		component.onGoToMonth(2);
		expect(component.currentMonth()).toBe(2);
		expect(component.selectedKey()).toBeNull();
	});

	it('should toggle the selected day', () => {
		component.onDaySelect('2026-03-10');
		expect(component.selectedKey()).toBe('2026-03-10');
		component.onDaySelect('2026-03-10');
		expect(component.selectedKey()).toBeNull();
	});

	it('should cross to the previous year when stepping back from January', () => {
		component.onGoToMonth(0);
		const year = component.currentYear();
		component.onStepMonth(-1);
		expect(component.currentYear()).toBe(year - 1);
		expect(component.currentMonth()).toBe(11);
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
// #endregion
