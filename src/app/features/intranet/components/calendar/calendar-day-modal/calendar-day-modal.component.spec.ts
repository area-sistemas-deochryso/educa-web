// #region Imports
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ModalData } from '@features/intranet/pages/cross-role/calendary-component/calendar.types';
import { CalendarDayModalComponent } from './calendar-day-modal.component';

// #endregion
// #region Implementation
const EVENT_DATA = {
	type: 'event',
	date: new Date(2026, 4, 12),
	event: {
		title: 'Feria de ciencias',
		type: 'academic',
		description: 'Muestra anual',
		time: '09:00',
		location: 'Patio',
		icon: 'pi-star',
	},
} as unknown as ModalData;

@Component({
	imports: [CalendarDayModalComponent],
	template: `<app-calendar-day-modal
		[visible]="visible()"
		[data]="data()"
		(closeModal)="closed = closed + 1; visible.set(false)"
	/>`,
})
class HostComponent {
	readonly visible = signal(true);
	readonly data = signal<ModalData | null>(EVENT_DATA);
	closed = 0;
}

describe('CalendarDayModalComponent', () => {
	afterEach(() => {
		document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
	});

	async function render() {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		return fixture;
	}

	it('renders inside an edu-dialog with the shared backdrop', async () => {
		await render();
		expect(document.querySelector('.edu-dialog-panel')?.getAttribute('role')).toBe('dialog');
		expect(document.querySelector('.cdk-overlay-backdrop.edu-dialog-backdrop')).toBeTruthy();
		expect(document.querySelector('.modal-title')?.textContent).toContain('Feria de ciencias');
	});

	it('emits closeModal on Escape', async () => {
		const fixture = await render();
		// * CDK reads the legacy `keyCode`, which the KeyboardEvent init dict doesn't set.
		const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
		Object.defineProperty(esc, 'keyCode', { value: 27 });
		document.body.dispatchEvent(esc);
		fixture.detectChanges();
		await fixture.whenStable();
		expect(fixture.componentInstance.closed).toBe(1);
	});

	it('emits closeModal on backdrop click', async () => {
		const fixture = await render();
		document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
		fixture.detectChanges();
		await fixture.whenStable();
		expect(fixture.componentInstance.closed).toBe(1);
	});
});
// #endregion
