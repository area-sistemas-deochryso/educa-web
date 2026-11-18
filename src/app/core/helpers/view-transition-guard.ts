// #region Imports
import { DOCUMENT } from '@angular/common';
import { inject, provideAppInitializer } from '@angular/core';
import { Router, UrlTree } from '@angular/router';

// #endregion
// #region Implementation
/**
 * `withViewTransitions()` llama a `document.startViewTransition` en TODA navegación, incluso si solo cambia un query param,
 * y una transición nueva aborta la activa (ej. la manual de Ayuda > FAQ). `onViewTransitionCreated` corre después de crearla
 * y el router no expone cómo saltarla, así que se envuelve la función: si la navegación en curso mantiene la ruta y solo
 * cambia query params/fragment, se ejecuta el callback sin transición.
 * También marca `<html class="has-vt">` para que el CSS use el crossfade del navegador en vez del fade de respaldo.
 */
export function provideViewTransitionGuard() {
	return provideAppInitializer(() => {
		const document = inject(DOCUMENT);
		const router = inject(Router);
		const original = document.startViewTransition?.bind(document);
		if (!original) return;

		document.documentElement.classList.add('has-vt');

		const pathOf = (tree: UrlTree): string => router.serializeUrl(new UrlTree(tree.root, {}, null));

		document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
			const target = router.currentNavigation()?.finalUrl ?? router.currentNavigation()?.extractedUrl;
			if (typeof callback !== 'function' || !target || pathOf(target) !== pathOf(router.parseUrl(router.url))) {
				return original(callback);
			}
			const done = Promise.resolve().then(callback);
			return {
				ready: Promise.resolve(),
				finished: done.then(() => undefined),
				updateCallbackDone: done.then(() => undefined),
				types: new Set<string>(),
				skipTransition: () => undefined,
			} as ViewTransition;
		}) as typeof document.startViewTransition;
	});
}
// #endregion
