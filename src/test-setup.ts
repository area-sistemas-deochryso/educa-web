// #region Imports
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

// Mock IntersectionObserver for jsdom environment
// #endregion
// #region Implementation
class MockIntersectionObserver implements IntersectionObserver {
	readonly root: Element | Document | null = null;
	readonly rootMargin: string = '';
	readonly thresholds: readonly number[] = [];
	readonly scrollMargin: string = '';

	constructor(private callback: IntersectionObserverCallback) {}

	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver,
});

// Mock ResizeObserver for jsdom
class MockResizeObserver implements ResizeObserver {
	constructor(private callback: ResizeObserverCallback) {}
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
	writable: true,
	configurable: true,
	value: MockResizeObserver,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true,
	}),
});

// Initialize TestBed
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
	teardown: { destroyAfterEach: true },
});

// Common test providers
export const testProviders = [
	provideZonelessChangeDetection(),
	provideRouter([]),
	provideHttpClient(),
	provideHttpClientTesting(),
];
// #endregion
