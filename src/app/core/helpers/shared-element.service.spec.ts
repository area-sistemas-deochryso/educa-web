import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SharedElementService } from './shared-element.service';

describe('SharedElementService', () => {
	let service: SharedElementService;
	let origin: HTMLElement;
	let destination: HTMLElement;
	const nameOf = (el: HTMLElement) => el.style.getPropertyValue('view-transition-name');
	const transition = () => {
		let end!: () => void;
		const finished = new Promise<void>((resolve) => (end = resolve));
		return { transition: { finished } as unknown as ViewTransition, end };
	};

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		service = TestBed.inject(SharedElementService);
		origin = document.createElement('div');
		destination = document.createElement('div');
		document.documentElement.classList.add('has-vt');
	});

	afterEach(() => document.documentElement.classList.remove('has-vt'));

	it('names the origin on activate and the destination when it registers during the transition', async () => {
		service.register('curso-1', origin);
		service.activate('curso-1', origin);
		const t = transition();
		service.track(t.transition);
		service.register('curso-1', destination);

		expect(nameOf(origin)).toBe('se-curso-1');
		expect(nameOf(destination)).toBe('se-curso-1');
		t.end();
		await t.transition.finished;
		await Promise.resolve();
	});

	it('removes every name once the transition finishes', async () => {
		service.register('curso-1', origin);
		service.activate('curso-1', origin);
		const t = transition();
		service.track(t.transition);
		service.register('curso-1', destination);
		t.end();
		await t.transition.finished;
		await Promise.resolve();

		expect(nameOf(origin)).toBe('');
		expect(nameOf(destination)).toBe('');
	});

	it('does nothing without View Transitions support', () => {
		document.documentElement.classList.remove('has-vt');
		service.register('curso-1', origin);
		service.activate('curso-1', origin);

		expect(nameOf(origin)).toBe('');
	});
});
