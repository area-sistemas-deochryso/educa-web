// #region Imports
import { Injectable, inject, signal, DestroyRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { StorageService } from '@core/services/storage';
// #endregion

// #region Constants

/** Class toggled on `document.documentElement` — matches `darkModeSelector` in `app.config.ts`. */
const DARK_MODE_CLASS = 'dark-mode';

/** OS/browser-level dark mode signal, followed live until the user picks manually. */
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

// #endregion

// #region Implementation

/**
 * Drives the intranet's real dark mode (brief 523 — F10/521 removed the dead
 * code, 522 fixed the resulting regression, this reintroduces the selector
 * with an actual toggle behind it).
 *
 * Behavior (product decision, do not reopen):
 * - No stored preference → follows `prefers-color-scheme` **live**: a
 *   `change` listener keeps the app in sync if the OS theme flips while the
 *   tab is open, same as GitHub/VS Code before the user ever touches the
 *   toggle.
 * - `toggle()` freezes an explicit choice into `localStorage`
 *   (`StorageService.setThemePreference`) and stops listening to the OS —
 *   the manual choice wins from then on, until cleared.
 * - The `dark-mode` class is applied on `document.documentElement` (global,
 *   not scoped to one component) — required for `darkModeSelector:
 *   '.dark-mode'` in `app.config.ts` to actually flip PrimeNG's Aura preset.
 *
 * @example
 * private theme = inject(ThemeService);
 * this.theme.isDarkMode(); // signal<boolean>
 * this.theme.toggle();
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
	// #region Dependencies
	private readonly storage = inject(StorageService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region State
	private readonly _isDarkMode = signal(this.resolveInitialDarkMode());
	readonly isDarkMode = this._isDarkMode.asReadonly();

	private mediaQuery: MediaQueryList | null = null;
	private readonly onSystemSchemeChange = (event: MediaQueryListEvent): void => {
		// Guard again at fire-time: a manual toggle since the listener was
		// attached must win, and the listener is removed on toggle, but this
		// stays defensive against any late-arriving event.
		if (this.storage.hasThemePreference()) return;
		this.setDarkMode(event.matches);
	};
	// #endregion

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		this.applyClass(this._isDarkMode());
		this.startFollowingSystemIfNoPreference();
		this.destroyRef.onDestroy(() => this.stopFollowingSystem());
	}

	/**
	 * Flip the theme and freeze it as an explicit `localStorage` preference.
	 * Stops following the OS scheme from this point on.
	 *
	 * @example
	 * this.theme.toggle();
	 */
	toggle(): void {
		const next = !this._isDarkMode();
		this.storage.setThemePreference(next ? 'dark' : 'light');
		this.stopFollowingSystem();
		this.setDarkMode(next);
	}

	// #region Private helpers

	private resolveInitialDarkMode(): boolean {
		if (!this.isBrowser) return false;

		const stored = this.storage.getThemePreference();
		if (stored) return stored === 'dark';

		return window.matchMedia(DARK_SCHEME_QUERY).matches;
	}

	private startFollowingSystemIfNoPreference(): void {
		if (!this.isBrowser || this.storage.hasThemePreference()) return;

		this.mediaQuery = window.matchMedia(DARK_SCHEME_QUERY);
		this.mediaQuery.addEventListener('change', this.onSystemSchemeChange);
	}

	private stopFollowingSystem(): void {
		this.mediaQuery?.removeEventListener('change', this.onSystemSchemeChange);
		this.mediaQuery = null;
	}

	private setDarkMode(dark: boolean): void {
		this._isDarkMode.set(dark);
		this.applyClass(dark);
	}

	private applyClass(dark: boolean): void {
		if (!this.isBrowser) return;
		document.documentElement.classList.toggle(DARK_MODE_CLASS, dark);
	}

	// #endregion
}
// #endregion
