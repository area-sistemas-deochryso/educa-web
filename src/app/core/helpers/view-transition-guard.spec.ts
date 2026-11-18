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
});
// #endregion
