// * Tests for InformativeModeService — validates toggle, interception y resolución de ancla.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InformativeModeService } from './informative-mode.service';

// #endregion

// #region Tests
describe('InformativeModeService', () => {
	let service: InformativeModeService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [InformativeModeService] });
		service = TestBed.inject(InformativeModeService);
	});

	afterEach(() => {
		if (service.active()) toggle();
		document.body.innerHTML = '';
	});

	// El listener se instala/desinstala dentro de un effect() — hay que flushearlo
	// (TestBed.tick()) antes de disparar el click de prueba, o el listener aún no está.
	function toggle(): void {
		service.toggle();
		TestBed.tick();
	}

	function click(el: HTMLElement): void {
		el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	}

	it('starts inactive with no callout', () => {
		expect(service.active()).toBe(false);
		expect(service.currentCallout()).toBeNull();
	});

	it('toggle() flips active state', () => {
		toggle();
		expect(service.active()).toBe(true);
		toggle();
		expect(service.active()).toBe(false);
	});

	it('blocks a click and shows the generic callout for an element without a declared anchor', () => {
		const button = document.createElement('button');
		document.body.appendChild(button);

		toggle();
		click(button);

		expect(service.currentCallout()?.text).toContain('Todavía no hay una explicación cargada');
	});

	it('resolves the test map content for an element with a declared anchor', () => {
		const button = document.createElement('button');
		button.dataset['infoAnchor'] = 'sample-anchor';
		document.body.appendChild(button);

		toggle();
		click(button);

		expect(service.currentCallout()?.text).toContain('Explicación de prueba');
	});

	it('resolves the anchor from the closest ancestor, not just the exact target', () => {
		const wrapper = document.createElement('div');
		wrapper.dataset['infoAnchor'] = 'sample-anchor';
		const icon = document.createElement('i');
		wrapper.appendChild(icon);
		document.body.appendChild(wrapper);

		toggle();
		click(icon);

		expect(service.currentCallout()?.text).toContain('Explicación de prueba');
	});

	it('exempts clicks inside app-intranet-fab-menu from interception', () => {
		const fab = document.createElement('app-intranet-fab-menu');
		const button = document.createElement('button');
		let ran = false;
		button.addEventListener('click', () => (ran = true));
		fab.appendChild(button);
		document.body.appendChild(fab);

		toggle();
		click(button);

		expect(ran).toBe(true);
		expect(service.currentCallout()).toBeNull();
	});

	it('clears the callout and stops intercepting when deactivated', () => {
		const button = document.createElement('button');
		document.body.appendChild(button);

		toggle();
		click(button);
		expect(service.currentCallout()).not.toBeNull();

		toggle();
		expect(service.currentCallout()).toBeNull();

		let ran = false;
		button.addEventListener('click', () => (ran = true));
		click(button);
		expect(ran).toBe(true);
	});

	it('dismissCallout() clears the current callout without deactivating the mode', () => {
		const button = document.createElement('button');
		document.body.appendChild(button);

		toggle();
		click(button);
		expect(service.currentCallout()).not.toBeNull();

		service.dismissCallout();
		expect(service.currentCallout()).toBeNull();
		expect(service.active()).toBe(true);
	});
});
// #endregion
