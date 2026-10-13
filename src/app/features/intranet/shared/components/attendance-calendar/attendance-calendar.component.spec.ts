import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AttendanceCalendarComponent } from './attendance-calendar.component';
import { AttendanceCalendarDay, buildMonthWeeks, toDayKey } from './attendance-calendar.helpers';

describe('AttendanceCalendarComponent', () => {
	let fixture: ComponentFixture<AttendanceCalendarComponent>;
	let componentRef: ComponentRef<AttendanceCalendarComponent>;
	let root: HTMLElement;

	const setup = (days: AttendanceCalendarDay[], extra: Record<string, unknown> = {}): void => {
		componentRef.setInput('days', days);
		componentRef.setInput('initialMonth', '2026-10');
		for (const [key, value] of Object.entries(extra)) componentRef.setInput(key, value);
		fixture.detectChanges();
	};

	const must = <T>(value: T | null | undefined): T => {
		if (value === null || value === undefined) throw new Error('Expected element not found');
		return value;
	};
	const cell = (day: number): HTMLElement => must(root.querySelector<HTMLElement>(`[data-day="${day}"]`));
	const button = (label: string): HTMLButtonElement =>
		must(root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`));
	const title = (): string => (must(root.querySelector('.attendance-calendar__title')).textContent ?? '').trim();
	const click = (label: string): void => {
		button(label).click();
		fixture.detectChanges();
	};
	const press = (target: HTMLElement, key: string): void => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		fixture.detectChanges();
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [AttendanceCalendarComponent] }).compileComponents();
		fixture = TestBed.createComponent(AttendanceCalendarComponent);
		componentRef = fixture.componentRef;
		root = fixture.nativeElement;
	});

	describe('date placement', () => {
		it('puts a record on its cell whether the date comes with or without time', () => {
			setup([
				{ fecha: '2026-10-12', estado: 'P' },
				{ fecha: '2026-10-13T00:00:00', estado: 'T' },
				{ fecha: '2026-10-14T23:59:59-05:00', estado: 'F' },
			]);

			expect(cell(12).dataset['estado']).toBe('P');
			expect(cell(13).dataset['estado']).toBe('T');
			expect(cell(14).dataset['estado']).toBe('F');
			expect(cell(11).dataset['estado']).toBeUndefined();
		});

		it('keeps the data when navigating to the previous and back to the next month', () => {
			setup([
				{ fecha: '2026-09-30', estado: 'F' },
				{ fecha: '2026-10-01', estado: 'P' },
			]);

			click('Mes anterior');
			expect(title()).toBe('septiembre de 2026');
			expect(cell(30).dataset['estado']).toBe('F');

			click('Mes siguiente');
			expect(title()).toBe('octubre de 2026');
			expect(cell(1).dataset['estado']).toBe('P');
		});

		it('ignores invalid dates and unknown states instead of inventing a day', () => {
			setup([
				{ fecha: '2026-02-30', estado: 'F' },
				{ fecha: 'no-es-fecha', estado: 'F' },
				{ fecha: '2026-10-05', estado: 'X' as never },
			]);

			expect(root.querySelectorAll('[data-estado]:not(li)').length).toBe(0);
		});

		it('shows the most severe state when two records share a date', () => {
			setup([
				{ fecha: '2026-10-05', estado: 'P' },
				{ fecha: '2026-10-05', estado: 'F', esRecuperacion: true },
			]);

			expect(cell(5).dataset['estado']).toBe('F');
			expect(cell(5).getAttribute('aria-label')).toContain('recuperación');
		});

		it('opens on the month of the latest record when no initial month is given', () => {
			componentRef.setInput('days', [
				{ fecha: '2026-03-02', estado: 'P' },
				{ fecha: '2026-05-04', estado: 'T' },
			]);
			fixture.detectChanges();

			expect(title()).toBe('mayo de 2026');
		});
	});

	describe('accessibility without color', () => {
		it('gives each state a distinct icon and aria-label', () => {
			setup([
				{ fecha: '2026-10-05', estado: 'P' },
				{ fecha: '2026-10-06', estado: 'T' },
				{ fecha: '2026-10-07', estado: 'F' },
			]);

			const icons = [5, 6, 7].map((d) => must(cell(d).querySelector('i.attendance-calendar__mark')).className);
			expect(new Set(icons).size).toBe(3);
			expect(cell(5).getAttribute('aria-label')).toBe('lunes 5 de octubre de 2026: Presente');
			expect(cell(6).getAttribute('aria-label')).toBe('martes 6 de octubre de 2026: Tarde');
			expect(cell(7).getAttribute('aria-label')).toBe('miércoles 7 de octubre de 2026: Faltó');
		});

		it('marks a recovery day with a badge and a spoken label, not just color', () => {
			setup([
				{ fecha: '2026-10-05', estado: 'P' },
				{ fecha: '2026-10-10', estado: 'P', esRecuperacion: true },
			]);

			expect(cell(10).querySelector('.attendance-calendar__recovery-badge')?.textContent?.trim()).toBe('R');
			expect(cell(10).classList).toContain('attendance-calendar__cell--recovery');
			expect(cell(10).getAttribute('aria-label')).toBe('sábado 10 de octubre de 2026: Presente, clase de recuperación');
			expect(cell(5).querySelector('.attendance-calendar__recovery-badge')).toBeNull();
		});

		it('lists every state and the recovery mark in the legend with text', () => {
			setup([]);
			const legend = must(root.querySelector('.attendance-calendar__legend')).textContent ?? '';
			for (const text of ['Presente', 'Tarde', 'Faltó', 'Recuperación', 'Sin registro']) {
				expect(legend).toContain(text);
			}
		});
	});

	describe('empty states (INV-AC11)', () => {
		it('says "Sin registros" for a month with no data and paints no state', () => {
			setup([{ fecha: '2026-09-15', estado: 'F' }]);

			expect(root.querySelector('.attendance-calendar__empty')?.textContent?.trim()).toBe('Sin registros');
			expect(root.querySelectorAll('.attendance-calendar__cell[data-estado]').length).toBe(0);
		});

		it('paints a day without record as neutral and "sin registro" inside a month with data', () => {
			setup([{ fecha: '2026-10-05', estado: 'F' }]);

			expect(root.querySelector('.attendance-calendar__empty')).toBeNull();
			expect(cell(6).dataset['estado']).toBeUndefined();
			expect(cell(6).querySelector('.attendance-calendar__mark')).toBeNull();
			expect(cell(6).getAttribute('aria-label')).toBe('martes 6 de octubre de 2026: sin registro');
		});
	});

	describe('month bounds', () => {
		it('disables navigation at minMonth / maxMonth and emits monthChange', () => {
			const emitted: string[] = [];
			fixture.componentInstance.monthChange.subscribe((m) => emitted.push(m));
			setup([], { minMonth: '2026-09', maxMonth: '2026-10' });

			expect(button('Mes siguiente').disabled).toBe(true);
			click('Mes anterior');
			expect(emitted).toEqual(['2026-09']);
			expect(button('Mes anterior').disabled).toBe(true);
		});
	});

	describe('keyboard', () => {
		it('has a single tab stop (roving tabindex)', () => {
			setup([{ fecha: '2026-10-05', estado: 'P' }]);

			const stops = root.querySelectorAll('[role="gridcell"][tabindex="0"]');
			expect(stops.length).toBe(1);
			expect((stops[0] as HTMLElement).dataset['day']).toBe('1');
		});

		it('moves focus with the arrow keys, Home/End and across months', async () => {
			setup([]);
			cell(1).focus();

			press(cell(1), 'ArrowRight');
			await fixture.whenStable();
			expect(document.activeElement).toBe(cell(2));

			press(cell(2), 'ArrowDown');
			await fixture.whenStable();
			expect(document.activeElement).toBe(cell(9));

			// 2026-10-09 es viernes: End → domingo 11, Home → lunes 5.
			press(cell(9), 'End');
			await fixture.whenStable();
			expect(document.activeElement).toBe(cell(11));
			press(cell(11), 'Home');
			await fixture.whenStable();
			expect(document.activeElement).toBe(cell(5));

			// Salta al mes anterior desde el día 1.
			press(cell(5), 'PageUp');
			await fixture.whenStable();
			expect(title()).toBe('septiembre de 2026');
			expect(document.activeElement).toBe(cell(5));
		});

		it('does not cross into a month outside the bounds', async () => {
			setup([], { minMonth: '2026-10' });
			cell(1).focus();

			press(cell(1), 'ArrowLeft');
			await fixture.whenStable();

			expect(title()).toBe('octubre de 2026');
			expect(document.activeElement).toBe(cell(1));
		});
	});

	describe('helpers', () => {
		it('lays out October 2026 starting on Thursday with Monday as first column', () => {
			const weeks = buildMonthWeeks(2026, 10);
			expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
			expect(weeks.at(-1)?.filter((d) => d !== null).at(-1)).toBe(31);
			expect(weeks.every((w) => w.length === 7)).toBe(true);
		});

		it('normalizes day keys without Date parsing', () => {
			expect(toDayKey('2026-10-12T00:00:00')).toBe('2026-10-12');
			expect(toDayKey('2026-13-01')).toBeNull();
			expect(toDayKey('2026-02-29')).toBeNull();
			expect(toDayKey(null)).toBeNull();
		});
	});
});
