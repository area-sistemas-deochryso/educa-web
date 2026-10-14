import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EduPassword } from './edu-password';

describe('EduPassword', () => {
	let changes: string[];

	beforeEach(() => {
		changes = [];
		TestBed.configureTestingModule({});
	});

	function render(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(EduPassword);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.componentInstance.registerOnChange((value) => changes.push(value));
		fixture.detectChanges();
		return fixture;
	}

	function type(fixture: { nativeElement: HTMLElement }, text: string): HTMLInputElement {
		const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
		input.value = text;
		input.dispatchEvent(new Event('input'));
		return input;
	}

	it('uppercases typed text in the DOM and the emitted value when uppercase is on (INV-S10)', () => {
		const fixture = render({ uppercase: true });
		const input = type(fixture, 'abc12#');
		expect(input.value).toBe('ABC12#');
		expect(changes).toEqual(['ABC12#']);
	});

	it('keeps the typed text untouched when uppercase is off', () => {
		const fixture = render();
		const input = type(fixture, 'abc');
		expect(input.value).toBe('abc');
		expect(changes).toEqual(['abc']);
	});
});
