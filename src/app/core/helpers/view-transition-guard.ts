// #region Imports
import { DOCUMENT } from '@angular/common';
import { inject, provideAppInitializer } from '@angular/core';
import { Router, UrlTree } from '@angular/router';

import { pageDirection } from './view-transition-direction';

// #endregion
// #region Implementation
const CONTENT_SELECTOR = '.intranet-content';
const CONTENT_VT_NAME = 'page-content';

/**
 * `withViewTransitions()` llama a `document.startViewTransition` en TODA navegación, incluso si solo cambia un query param,
 * y una transición nueva aborta la activa (ej. la manual de Ayuda > FAQ). `onViewTransitionCreated` corre después de crearla
 * y el router no expone cómo saltarla, así que se envuelve la función: si la navegación en curso mantiene la ruta y solo
 * cambia query params/fragment, se ejecuta el callback sin transición.
 * También marca `<html class="has-vt">` para que el CSS use el crossfade del navegador en vez del fade de respaldo.
 *
 * Slide direccional (plan F11 F9): justo antes de la transición nativa, si el destino es más profundo o más superficial
 * que el origen (`pageDirection`), se pone `data-vt-direction` en `<html>` y el nombre `page-content` en el contenido
 * de la intranet (solo el contenido se desliza, no el sidebar ni el topbar). El nombre solo vive mientras dura la
 * transición: permanente crearía un containing block para los `position: fixed` de las páginas. Ambos se quitan al
 * terminar, y no se ponen en navegaciones de solo query params, transiciones manuales ni con reduced-motion.
 */
export function provideViewTransitionGuard() {
	return provideAppInitializer(() => {
		const document = inject(DOCUMENT);
		const router = inject(Router);
		const original = document.startViewTransition?.bind(document);
		if (!original) return;

		document.documentElement.classList.add('has-vt');

		const pathOf = (tree: UrlTree): string => router.serializeUrl(new UrlTree(tree.root, {}, null));

		const root = document.documentElement;
		/** Transición que puso la dirección: una posterior que la aborte no debe ver sus marcas quitadas por la anterior. */
		let directed: ViewTransition | null = null;

		const clearDirection = (): void => {
			directed = null;
			root.removeAttribute('data-vt-direction');
			document.querySelector<HTMLElement>(CONTENT_SELECTOR)?.style.removeProperty('view-transition-name');
		};

		const markDirection = (fromPath: string, toPath: string): boolean => {
			const direction = pageDirection(fromPath, toPath);
			const content = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
			const reduced = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			if (!direction || !content || reduced) return false;
			root.setAttribute('data-vt-direction', direction);
			content.style.setProperty('view-transition-name', CONTENT_VT_NAME);
			return true;
		};

		document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
			const target = router.currentNavigation()?.finalUrl ?? router.currentNavigation()?.extractedUrl;
			const targetPath = target ? pathOf(target) : null;
			const currentPath = pathOf(router.parseUrl(router.url));
			if (typeof callback !== 'function' || !targetPath || targetPath !== currentPath) {
				clearDirection();
				const marked = typeof callback === 'function' && !!targetPath && markDirection(currentPath, targetPath);
				const transition = original(callback);
				if (marked) {
					directed = transition;
					void transition.finished.finally(() => {
						if (directed === transition) clearDirection();
					});
				}
				return transition;
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
