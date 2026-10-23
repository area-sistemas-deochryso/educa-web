import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EduDatePicker } from './edu-datepicker';

describe('EduDatePicker', () => {
	let changes: unknown[];

	beforeEach(() => {
		changes = [];
		TestBed.configureTestingModule({});
	});

	afterEach(() => {
		document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
	});

	async function render(inputs: Record<string, unknown> = {}, initial: Date | null = null) {
		const fixture = TestBed.createComponent(EduDatePicker);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.componentInstance.registerOnChange((value) => changes.push(value));
		fixture.componentInstance.writeValue(initial);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	const host = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement;
	const input = (fixture: { nativeElement: HTMLElement }) =>
		host(fixture).querySelector<HTMLInputElement>('.edu-datepicker__input')!;
	const errorText = (fixture: { nativeElement: HTMLElement }) =>
		host(fixture).querySelector('.edu-datepicker__error')?.textContent?.trim() ?? null;

	async function type(fixture: Awaited<ReturnType<typeof render>>, text: string) {
		const el = input(fixture);
		el.dispatchEvent(new Event('focus'));
		el.value = text;
		el.dispatchEvent(new Event('input'));
		el.dispatchEvent(new Event('blur'));
		fixture.detectChanges();
		await fixture.whenStable();
	}

	describe('discoverability', () => {
		it('hints the format in the placeholder when none is given', async () => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' });

			expect(input(fixture).placeholder).toBe('dd/mm/aa');
		});

		it('keeps an explicit placeholder', async () => {
			const fixture = await render({ placeholder: 'Desde' });

			expect(input(fixture).placeholder).toBe('Desde');
		});

		it('shows a calendar button by default and honours showIcon=false', async () => {
			const withIcon = await render();
			expect(host(withIcon).querySelector('button.edu-datepicker__icon')).not.toBeNull();

			const withoutIcon = await render({ showIcon: false });
			expect(host(withoutIcon).querySelector('button.edu-datepicker__icon')).toBeNull();
		});

		it('opens the calendar when clicking the input, keeping the caret in it', async () => {
			const fixture = await render();
			const el = input(fixture);
			el.focus();

			el.click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(document.querySelector('.edu-datepicker-panel')).not.toBeNull();
			expect(document.activeElement).toBe(el);
		});

		it('opens the calendar when clicking the icon', async () => {
			const fixture = await render();

			host(fixture).querySelector<HTMLElement>('.edu-datepicker__icon')!.click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(document.querySelector('.edu-datepicker-panel')).not.toBeNull();
		});
	});

	describe('typed text', () => {
		it.each(['15/10/26', '15/10/2026'])('commits %s with a 2-digit-year format', async (text) => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' });

			await type(fixture, text);

			const committed = changes.at(-1) as Date;
			expect(committed.getFullYear()).toBe(2026);
			expect(committed.getMonth()).toBe(9);
			expect(committed.getDate()).toBe(15);
			expect(errorText(fixture)).toBeNull();
		});

		it('explains unparseable text instead of emptying the field', async () => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' });

			await type(fixture, '15 de octubre');

			expect(changes).toEqual([]);
			expect(input(fixture).value).toBe('15 de octubre');
			expect(errorText(fixture)).toContain('dd/mm/aa');
			expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
		});

		it('rejects a day that does not exist rather than rolling it into the next month', async () => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' });

			await type(fixture, '31/02/2026');

			expect(changes).toEqual([]);
			expect(errorText(fixture)).not.toBeNull();
		});

		it('names the allowed bound when the date is disabled', async () => {
			const fixture = await render({
				dateFormat: 'dd/mm/yy',
				minDate: new Date(2026, 9, 20),
				maxDate: new Date(2026, 9, 30),
			});

			await type(fixture, '15/10/2026');
			expect(changes).toEqual([]);
			expect(errorText(fixture)).toContain('primera permitida es 20/10/26');

			await type(fixture, '05/11/2026');
			expect(errorText(fixture)).toContain('última permitida es 30/10/26');
		});

		it('clears the message once a valid date is typed', async () => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' });
			await type(fixture, 'xx');
			expect(errorText(fixture)).not.toBeNull();

			await type(fixture, '15/10/2026');

			expect(errorText(fixture)).toBeNull();
			expect(changes).toHaveLength(1);
		});

		it('clears the value when the user empties the field', async () => {
			const fixture = await render({ dateFormat: 'dd/mm/yy' }, new Date(2026, 9, 15));

			await type(fixture, '');

			expect(changes).toEqual([null]);
			expect(errorText(fixture)).toBeNull();
		});
	});

	describe('other modes', () => {
		it('does not hint a format for range or readonly fields', async () => {
			const range = await render({ selectionMode: 'range' });
			expect(input(range).placeholder).toBe('');

			const readonlyField = await render({ readonlyInput: true });
			expect(input(readonlyField).placeholder).toBe('');
		});

		it('still lets a readonly field open the calendar from the input', async () => {
			const fixture = await render({ readonlyInput: true });

			input(fixture).click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(document.querySelector('.edu-datepicker-panel')).not.toBeNull();
		});
	});

	describe('initial month', () => {
		const panelTitle = () => document.querySelector('.edu-datepicker-panel')?.textContent ?? '';

		async function openCalendar(fixture: Awaited<ReturnType<typeof render>>) {
			input(fixture).click();
			fixture.detectChanges();
			await fixture.whenStable();
		}

		it('opens on the allowed range when today falls outside it', async () => {
			// Rango en el pasado: hoy siempre queda después de `maxDate`.
			const fixture = await render({ minDate: new Date(2020, 2, 1), maxDate: new Date(2020, 2, 7) });

			await openCalendar(fixture);

			expect(panelTitle()).toContain('2020');
		});

		it('keeps opening on today when it is inside the range', async () => {
			const hoy = new Date();
			const fixture = await render({
				minDate: new Date(hoy.getFullYear() - 1, 0, 1),
				maxDate: new Date(hoy.getFullYear() + 1, 11, 31),
			});

			await openCalendar(fixture);

			expect(panelTitle()).toContain(String(hoy.getFullYear()));
		});
	});
});
