import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** Ancho máximo (px) considerado «móvil» para cambiar tablas por cards. */
export const MOBILE_CARDS_QUERY = '(max-width: 767px)';

/**
 * Señal que sigue una media query. Debe llamarse en un contexto de inyección (campo de clase o
 * constructor). Sin `matchMedia` (SSR, tests en jsdom) devuelve `false`, es decir, layout de escritorio.
 */
export function injectIsMobile(query: string = MOBILE_CARDS_QUERY): Signal<boolean> {
	const destroyRef = inject(DestroyRef);
	const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
	const state = signal(mq?.matches ?? false);

	if (mq) {
		const onChange = (event: MediaQueryListEvent): void => state.set(event.matches);
		mq.addEventListener('change', onChange);
		destroyRef.onDestroy(() => mq.removeEventListener('change', onChange));
	}

	return state.asReadonly();
}
