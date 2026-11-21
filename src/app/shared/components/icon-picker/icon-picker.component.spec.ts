import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { IconPickerComponent } from './icon-picker.component';

const OPTIONS = [
	{ label: 'Calendario', value: 'pi-calendar' },
	{ label: 'Libro', value: 'pi-book' },
	{ label: 'Trofeo', value: 'pi-trophy' },
];

function setup(value: string) {
	const fixture = TestBed.createComponent(IconPickerComponent);
	fixture.componentRef.setInput('options', OPTIONS);
	fixture.componentRef.setInput('value', value);
	fixture.detectChanges();
	const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
	return { fixture, buttons };
}

describe('IconPickerComponent', () => {
	it('renderiza un botón por opción con su nombre accesible', () => {
		const { buttons } = setup('pi-book');
		expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Calendario', 'Libro', 'Trofeo']);
	});

	it('marca solo la opción elegida', () => {
		const { buttons } = setup('pi-book');
		expect(buttons.map((b) => b.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
	});

	it('cambia el valor al elegir otra opción', () => {
		const { fixture, buttons } = setup('pi-book');
		buttons[2].click();
		fixture.detectChanges();
		expect(fixture.componentInstance.value()).toBe('pi-trophy');
		expect(buttons[2].getAttribute('aria-checked')).toBe('true');
	});
});
