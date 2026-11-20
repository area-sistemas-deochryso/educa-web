import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EduAccordion } from './edu-accordion';
import { EduAccordionHeader } from './edu-accordion-header';
import { EduAccordionPanel } from './edu-accordion-panel';

@Component({
	standalone: true,
	imports: [EduAccordion, EduAccordionPanel, EduAccordionHeader],
	template: `
		<edu-accordion>
			<edu-accordion-panel value="a">
				<edu-accordion-header>Semana</edu-accordion-header>
				<p class="content">Contenido</p>
			</edu-accordion-panel>
		</edu-accordion>
	`,
})
class HostComponent {}

describe('EduAccordionPanel — altura animada', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function render() {
		const fixture = TestBed.createComponent(HostComponent);
		const settle = () => {
			fixture.detectChanges();
			TestBed.tick();
			fixture.detectChanges();
		};
		settle();
		const el = fixture.nativeElement as HTMLElement;
		const region = () => el.querySelector('[role="region"]') as HTMLElement | null;
		const toggle = () => {
			(el.querySelector('edu-accordion-header [role="button"], edu-accordion-header button') as HTMLElement).click();
			settle();
		};
		return { settle, region, toggle };
	}

	it('al abrir aparece con role="region"', () => {
		const { region, toggle } = render();
		expect(region()).toBeNull();

		toggle();
		expect(region()).not.toBeNull();
		expect(region()?.classList.contains('edu-accordion-panel__content--leaving')).toBe(false);
	});

	it('al cerrar retiene el contenido hasta terminar la salida y luego lo quita', () => {
		const { region, toggle, settle } = render();
		toggle();
		toggle();
		expect(region()?.classList.contains('edu-accordion-panel__content--leaving')).toBe(true);
		expect(region()?.hasAttribute('inert')).toBe(true);

		vi.advanceTimersByTime(600);
		settle();
		expect(region()).toBeNull();
	});

	it('reabrir durante la salida cancela el retiro', () => {
		const { region, toggle, settle } = render();
		toggle();
		toggle();
		toggle();
		vi.advanceTimersByTime(600);
		settle();
		expect(region()).not.toBeNull();
		expect(region()?.classList.contains('edu-accordion-panel__content--leaving')).toBe(false);
	});
});
