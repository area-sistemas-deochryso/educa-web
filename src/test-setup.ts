import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

// Mock IntersectionObserver for jsdom environment
class MockIntersectionObserver implements IntersectionObserver {
	// eslint-disable-next-line unicorn/no-null
	readonly root: Element | Document | null = null;
	readonly rootMargin: string = '';
	readonly thresholds: ReadonlyArray<number> = [];

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

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
	teardown: { destroyAfterEach: false },
});

export const testProviders = [provideZonelessChangeDetection(), provideRouter([])];
