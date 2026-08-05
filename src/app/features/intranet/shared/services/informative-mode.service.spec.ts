// * Tests for InformativeModeService — validates toggle, interception, hold-to-bypass y
// * resolución de anclas contra el backend (F4).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InformativeContentService } from '@core/services/informative-mode';

import { InformativeModeService } from './informative-mode.service';

// #endregion

// #region Tests
describe('InformativeModeService', () => {
	let service: InformativeModeService;
	let resolverMock: ReturnType<typeof vi.fn>;
	let routerEvents$: Subject<NavigationEnd>;

	beforeEach(() => {
		resolverMock = vi.fn().mockReturnValue(of({}));
		routerEvents$ = new Subject<NavigationEnd>();

		TestBed.configureTestingModule({
			providers: [
				InformativeModeService,
				{ provide: Router, useValue: { events: routerEvents$.asObservable() } },
				{ provide: InformativeContentService, useValue: { resolver: resolverMock } },
			],
		});
		service = TestBed.inject(InformativeModeService);
	});

	afterEach(() => {
		if (service.active()) toggle();
		document.body.innerHTML = '';
	});

	// El listener (y el fetch de contenido) se instalan dentro de effect() — hay que flushearlo
	// (TestBed.tick()) antes de disparar el click de prueba, o el listener aún no está.
	function toggle(): void {
		service.toggle();
		TestBed.tick();
	}

	/** Deja asentar los microtasks encolados por `firstValueFrom` dentro del effect de fetch. */
	async function flushAsync(): Promise<void> {
		for (let i = 0; i < 5; i++) {
			await Promise.resolve();
		}
	}

	function click(el: HTMLElement): void {
		el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	}

	// jsdom no implementa PointerEvent — un MouseEvent con ese `type` alcanza para el listener.
	function pointerDown(el: HTMLElement): void {
		el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
	}

	function navigate(url = '/intranet/otra-pagina'): void {
		routerEvents$.next(new NavigationEnd(1, url, url));
		TestBed.tick();
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

	it('resolves fetched content for an element with a declared anchor', async () => {
		resolverMock.mockReturnValue(of({ 'sample-anchor': 'Explicación real desde el backend.' }));
		const button = document.createElement('button');
		button.dataset['infoAnchor'] = 'sample-anchor';
		document.body.appendChild(button);

		toggle();
		await flushAsync();
		click(button);

		expect(service.currentCallout()?.text).toBe('Explicación real desde el backend.');
	});

	it('resolves the anchor from the closest ancestor, not just the exact target', async () => {
		resolverMock.mockReturnValue(of({ 'sample-anchor': 'Explicación real desde el backend.' }));
		const wrapper = document.createElement('div');
		wrapper.dataset['infoAnchor'] = 'sample-anchor';
		const icon = document.createElement('i');
		wrapper.appendChild(icon);
		document.body.appendChild(wrapper);

		toggle();
		await flushAsync();
		click(icon);

		expect(service.currentCallout()?.text).toBe('Explicación real desde el backend.');
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

	describe('hold-to-bypass', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('lets a held click (≥500ms between pointerdown and click) run the original action', () => {
			const button = document.createElement('button');
			let ran = false;
			button.addEventListener('click', () => (ran = true));
			document.body.appendChild(button);

			toggle();
			pointerDown(button);
			vi.advanceTimersByTime(600);
			click(button);

			expect(ran).toBe(true);
			expect(service.currentCallout()).toBeNull();
		});

		it('still intercepts a quick click (<500ms between pointerdown and click)', () => {
			const button = document.createElement('button');
			let ran = false;
			button.addEventListener('click', () => (ran = true));
			document.body.appendChild(button);

			toggle();
			pointerDown(button);
			vi.advanceTimersByTime(100);
			click(button);

			expect(ran).toBe(false);
			expect(service.currentCallout()).not.toBeNull();
		});

		it('intercepts a click with no preceding pointerdown (ej. activación por teclado)', () => {
			const button = document.createElement('button');
			let ran = false;
			button.addEventListener('click', () => (ran = true));
			document.body.appendChild(button);

			toggle();
			vi.advanceTimersByTime(600);
			click(button);

			expect(ran).toBe(false);
			expect(service.currentCallout()).not.toBeNull();
		});

		it('resets the hold state after each click, so a second quick click after a hold is intercepted again', () => {
			const button = document.createElement('button');
			document.body.appendChild(button);

			toggle();
			pointerDown(button);
			vi.advanceTimersByTime(600);
			click(button);
			expect(service.currentCallout()).toBeNull();

			click(button);
			expect(service.currentCallout()).not.toBeNull();
		});
	});

	describe('F4 — conexión con contenido real por ancla', () => {
		it('escanea el DOM y pide un batch con las claves únicas presentes al activar el modo', async () => {
			const a = document.createElement('div');
			a.dataset['infoAnchor'] = 'anchor-a';
			const b = document.createElement('div');
			b.dataset['infoAnchor'] = 'anchor-b';
			const bDup = document.createElement('div');
			bDup.dataset['infoAnchor'] = 'anchor-b';
			document.body.append(a, b, bDup);

			toggle();
			await flushAsync();

			expect(resolverMock).toHaveBeenCalledTimes(1);
			const anclas = resolverMock.mock.calls[0][0] as string[];
			expect([...anclas].sort()).toEqual(['anchor-a', 'anchor-b']);
		});

		it('no pide nada al backend si no hay anclas en la vista', async () => {
			toggle();
			await flushAsync();

			expect(resolverMock).not.toHaveBeenCalled();
		});

		it('re-pide el contenido en cada navegación mientras el modo sigue activo', async () => {
			const el = document.createElement('div');
			el.dataset['infoAnchor'] = 'anchor-a';
			document.body.appendChild(el);

			toggle();
			await flushAsync();
			expect(resolverMock).toHaveBeenCalledTimes(1);

			navigate();
			await flushAsync();
			expect(resolverMock).toHaveBeenCalledTimes(2);
		});

		it('no re-pide contenido en una navegación mientras el modo está inactivo', async () => {
			navigate();
			await flushAsync();

			expect(resolverMock).not.toHaveBeenCalled();
		});

		it('cae al mensaje genérico si el fetch del batch falla', async () => {
			resolverMock.mockReturnValue(throwError(() => new Error('network down')));
			const button = document.createElement('button');
			button.dataset['infoAnchor'] = 'anchor-a';
			document.body.appendChild(button);

			toggle();
			await flushAsync();
			click(button);

			expect(service.currentCallout()?.text).toContain('Todavía no hay una explicación cargada');
		});

		it('descarta el contenido cacheado al desactivar el modo', async () => {
			resolverMock.mockReturnValue(of({ 'anchor-a': 'Explicación real.' }));
			const button = document.createElement('button');
			button.dataset['infoAnchor'] = 'anchor-a';
			document.body.appendChild(button);

			toggle();
			await flushAsync();
			click(button);
			expect(service.currentCallout()?.text).toBe('Explicación real.');

			toggle(); // desactiva
			resolverMock.mockReturnValue(of({}));
			toggle(); // reactiva sin contenido nuevo todavía resuelto
			click(button);

			expect(service.currentCallout()?.text).toContain('Todavía no hay una explicación cargada');
		});
	});

	describe('F7 — re-escaneo ante overlays que montan tarde (brief 527)', () => {
		it('vuelve a pedir contenido cuando aparece una ancla nueva en el DOM sin navegar', async () => {
			toggle();
			await flushAsync();
			expect(resolverMock).not.toHaveBeenCalled(); // sin anclas en la vista todavía

			resolverMock.mockReturnValue(of({ 'late-anchor': 'Explicación de un overlay que abrió después.' }));
			const late = document.createElement('div');
			late.dataset['infoAnchor'] = 'late-anchor';
			document.body.appendChild(late);

			await new Promise((resolve) => setTimeout(resolve, 200));
			await flushAsync();

			expect(resolverMock).toHaveBeenCalledTimes(1);
			click(late);
			expect(service.currentCallout()?.text).toBe('Explicación de un overlay que abrió después.');
		});

		it('no vuelve a pedir contenido si la mutación del DOM no trae anclas nuevas', async () => {
			const el = document.createElement('div');
			el.dataset['infoAnchor'] = 'anchor-a';
			document.body.appendChild(el);
			resolverMock.mockReturnValue(of({ 'anchor-a': 'Explicación existente.' }));

			toggle();
			await flushAsync();
			expect(resolverMock).toHaveBeenCalledTimes(1);

			const unrelated = document.createElement('span');
			document.body.appendChild(unrelated);
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(resolverMock).toHaveBeenCalledTimes(1);
		});

		it('deja de observar el DOM al desactivar el modo (sin re-escaneo tras el toggle off)', async () => {
			toggle();
			await flushAsync();
			toggle(); // desactiva

			const late = document.createElement('div');
			late.dataset['infoAnchor'] = 'late-anchor';
			document.body.appendChild(late);
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(resolverMock).not.toHaveBeenCalled();
		});
	});
});
// #endregion
