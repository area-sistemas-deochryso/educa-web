import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CountUpComponent } from './count-up.component';

@Component({
	standalone: true,
	imports: [CountUpComponent],
	template: `<app-count-up [value]="value()" />`,
})
class HostComponent {
	readonly value = signal<number | string>(0);
}

describe('CountUpComponent', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function render(initial: number | string) {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.value.set(initial);
		const settle = () => {
			fixture.detectChanges();
			TestBed.tick();
			fixture.detectChanges();
		};
		settle();
		const el = fixture.nativeElement as HTMLElement;
		const visible = () => el.querySelector('[aria-hidden="true"]')?.textContent?.trim();
		const final = () => el.querySelector('.count-up__final')?.textContent?.trim();
		return { fixture, settle, visible, final, el };
	}

	it('sube desde 0 hasta el valor final y deja el valor final accesible desde el inicio', () => {
		const { settle, visible, final } = render(40);
		expect(final()).toBe('40');
		expect(Number(visible())).toBeLessThan(40);

		vi.advanceTimersByTime(5000);
		settle();
		expect(visible()).toBe('40');
		expect(final()).toBe('40');
	});

	it('ante un cambio parte del valor anterior, no de 0', () => {
		const { fixture, settle, visible } = render(40);
		vi.advanceTimersByTime(5000);
		settle();

		fixture.componentInstance.value.set(50);
		settle();
		expect(Number(visible())).toBeGreaterThanOrEqual(40);

		vi.advanceTimersByTime(5000);
		settle();
		expect(visible()).toBe('50');
	});

	it('con 0 no anima y muestra el valor al instante', () => {
		const { visible } = render(0);
		expect(visible()).toBe('0');
	});

	it('un texto se muestra tal cual, sin animar', () => {
		const { el, visible } = render('95 %');
		expect(visible()).toBeUndefined();
		expect(el.textContent?.trim()).toBe('95 %');
	});

	it('con prefers-reduced-motion muestra el valor final al instante', () => {
		const original = window.matchMedia;
		window.matchMedia = ((query: string) => ({ matches: true, media: query }) as MediaQueryList) as typeof window.matchMedia;
		try {
			const { visible } = render(40);
			expect(visible()).toBe('40');
		} finally {
			window.matchMedia = original;
		}
	});
});
