// * Tests for view-transition-guard — skips the router's View Transition on query-only navigations.
// #region Imports
import { DOCUMENT } from '@angular/common';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Navigation, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideViewTransitionGuard } from './view-transition-guard';

// #endregion

// #region Tests
describe('provideViewTransitionGuard', () => {
	const original = vi.fn(() => ({ marker: 'native' }) as unknown as ViewTransition);
	let doc: Document;
	let router: Router;

	const navigatingTo = (url: string | null): void => {
		vi.spyOn(router, 'currentNavigation').mockReturnValue(
			url ? ({ finalUrl: router.parseUrl(url) } as unknown as Navigation) : null,
		);
	};

	beforeEach(async () => {
		original.mockClear();
		doc = document.implementation.createHTMLDocument('t');
		(doc as unknown as { startViewTransition: unknown }).startViewTransition = original;
		TestBed.configureTestingModule({
			providers: [
				{ provide: DOCUMENT, useValue: doc },
				provideRouter([]),
				provideViewTransitionGuard(),
			],
		});
		router = TestBed.inject(Router);
		vi.spyOn(router, 'url', 'get').mockReturnValue('/a');
		await TestBed.inject(ApplicationInitStatus).donePromise;
	});

	it('should mark the document with has-vt when the API exists', () => {
		expect(doc.documentElement.classList.contains('has-vt')).toBe(true);
	});

	it('should delegate to the native API when the path changes', () => {
		navigatingTo('/b');
		doc.startViewTransition(() => undefined);
		expect(original).toHaveBeenCalledOnce();
	});

	it('should run the callback without a transition when only query params change', async () => {
		navigatingTo('/a?x=1');
		const cb = vi.fn();
		const t = doc.startViewTransition(cb);
		await t.updateCallbackDone;
		expect(original).not.toHaveBeenCalled();
		expect(cb).toHaveBeenCalledOnce();
	});

	it('should delegate when there is no navigation in progress (manual transitions)', () => {
		navigatingTo(null);
		doc.startViewTransition(() => undefined);
		expect(original).toHaveBeenCalledOnce();
	});

	describe('page direction', () => {
		let content: HTMLElement;
		const direction = (): string | null => doc.documentElement.getAttribute('data-vt-direction');
		const vtName = (): string => content.style.getPropertyValue('view-transition-name');

		/** Transición nativa simulada: `finished` se resuelve a mano. */
		const nativeTransition = () => {
			let finish!: () => void;
			const finished = new Promise<void>((resolve) => (finish = resolve));
			original.mockReturnValueOnce({ finished } as unknown as ViewTransition);
			return {
				finish: async (): Promise<void> => {
					finish();
					await finished;
					await Promise.resolve();
				},
			};
		};

		beforeEach(() => {
			content = doc.createElement('main');
			content.className = 'intranet-content';
			doc.body.appendChild(content);
			vi.spyOn(router, 'url', 'get').mockReturnValue('/intranet/cursos');
		});

		it('should mark forward and name the content while the transition runs, then clean up', async () => {
			navigatingTo('/intranet/cursos/12');
			const native = nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBe('forward');
			expect(vtName()).toBe('page-content');
			await native.finish();
			expect(direction()).toBeNull();
			expect(vtName()).toBe('');
		});

		it('should mark back when going to an ancestor path', () => {
			vi.spyOn(router, 'url', 'get').mockReturnValue('/intranet/cursos/12');
			navigatingTo('/intranet/cursos');
			nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBe('back');
		});

		it('should not mark anything on query-only navigations', () => {
			navigatingTo('/intranet/cursos?x=1');
			doc.startViewTransition(() => undefined);
			expect(direction()).toBeNull();
			expect(vtName()).toBe('');
		});

		it('should not mark siblings', () => {
			navigatingTo('/intranet/horarios');
			nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBeNull();
			expect(vtName()).toBe('');
		});

		it('should not mark manual transitions (no navigation in progress)', () => {
			navigatingTo(null);
			nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBeNull();
		});

		it('should not mark when the user prefers reduced motion', () => {
			Object.defineProperty(doc, 'defaultView', {
				value: { matchMedia: () => ({ matches: true }) },
				configurable: true,
			});
			navigatingTo('/intranet/cursos/12');
			nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBeNull();
			expect(vtName()).toBe('');
		});

		it('should not mark when there is no content container (login)', () => {
			content.remove();
			navigatingTo('/intranet/cursos/12');
			nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBeNull();
		});

		it('should keep the marks of a newer transition when an aborted one finishes late', async () => {
			navigatingTo('/intranet/cursos/12');
			const first = nativeTransition();
			doc.startViewTransition(() => undefined);

			vi.spyOn(router, 'url', 'get').mockReturnValue('/intranet/cursos/12');
			navigatingTo('/intranet/cursos');
			const second = nativeTransition();
			doc.startViewTransition(() => undefined);
			expect(direction()).toBe('back');

			await first.finish();
			expect(direction()).toBe('back');
			await second.finish();
			expect(direction()).toBeNull();
		});
	});
});
// #endregion
