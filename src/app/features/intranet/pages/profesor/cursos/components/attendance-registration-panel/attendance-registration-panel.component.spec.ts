import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AttendanceRegistrationPanelComponent } from './attendance-registration-panel.component';

describe('AttendanceRegistrationPanelComponent', () => {
	function create(initialFecha: string) {
		const fixture = TestBed.createComponent(AttendanceRegistrationPanelComponent);
		fixture.componentRef.setInput('initialFecha', initialFecha);
		fixture.detectChanges();
		return fixture;
	}
	const iso = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

	describe('fecha inicial y reset', () => {
		it('starts on the given date', () => {
			const fixture = create('2026-10-05');

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-05');
		});

		it('does not overwrite the date the user picked when the input has not changed', () => {
			const fixture = create('2026-10-05');
			fixture.componentInstance.selectedDate = new Date(2026, 9, 7);

			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-07');
		});

		it('puts the datepicker back on the current date when the parent rejects the change', () => {
			const fixture = create('2026-10-05');
			fixture.componentInstance.selectedDate = new Date(2026, 9, 7);

			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-05');
		});

		it('follows a new initial date again after a reset', () => {
			const fixture = create('2026-10-05');
			fixture.componentRef.setInput('fechaResetKey', 1);
			fixture.detectChanges();

			fixture.componentRef.setInput('initialFecha', '2026-10-12');
			fixture.detectChanges();

			expect(iso(fixture.componentInstance.selectedDate)).toBe('2026-10-12');
		});
	});
});
