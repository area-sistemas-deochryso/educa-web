// #region Imports
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

// #endregion
// #region Implementation
const SHARED_CLASS = 'shared-element';

/**
 * Elementos compartidos entre páginas: el elemento clicado «se convierte» en su destino durante la View Transition
 * del router. `view-transition-name` debe ser único por captura, así que el nombre solo vive mientras dura la
 * navegación: se pone al click (origen), al registrarse el destino y en `NavigationStart` (la vuelta), y se retira
 * al terminar la transición.
 */
@Injectable({ providedIn: 'root' })
export class SharedElementService {
	private readonly document = inject(DOCUMENT);
	private readonly elements = new Map<string, Set<HTMLElement>>();
	private readonly named = new Set<HTMLElement>();
	/** Id del último elemento compartido: sigue activo tras llegar para que la vuelta lo encuentre. */
	private activeId: string | null = null;
	private transitionRunning = false;

	constructor() {
		const router = inject(Router);
		router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
			if (event instanceof NavigationStart) {
				this.nameActive();
			} else if (
				event instanceof NavigationEnd ||
				event instanceof NavigationCancel ||
				event instanceof NavigationError
			) {
				// Sin transición (navegación cancelada, query-only, sin soporte) nadie llamará a `finish`.
				setTimeout(() => {
					if (!this.transitionRunning) this.finish();
				});
			}
		});
	}

	register(id: string, el: HTMLElement): void {
		const group = this.elements.get(id) ?? new Set<HTMLElement>();
		group.add(el);
		this.elements.set(id, group);
		if (this.activeId === id && this.transitionRunning) this.name(id, el);
	}

	unregister(id: string, el: HTMLElement): void {
		this.elements.get(id)?.delete(el);
		this.named.delete(el);
	}

	/** El usuario activó un enlace dentro del origen: es el elemento que viaja. */
	activate(id: string, el: HTMLElement): void {
		if (!this.enabled()) return;
		this.activeId = id;
		this.name(id, el);
	}

	/** Se engancha desde `onViewTransitionCreated` del router. */
	track(transition: ViewTransition): void {
		if (!this.activeId) return;
		this.transitionRunning = true;
		void transition.finished.finally(() => this.finish());
	}

	private finish(): void {
		this.transitionRunning = false;
		for (const el of this.named) {
			el.style.removeProperty('view-transition-name');
			el.style.removeProperty('view-transition-class');
		}
		this.named.clear();
		if (!this.activeId || !this.elements.get(this.activeId)?.size) this.activeId = null;
	}

	private nameActive(): void {
		if (!this.activeId || !this.enabled()) return;
		for (const el of this.elements.get(this.activeId) ?? []) this.name(this.activeId, el);
	}

	private name(id: string, el: HTMLElement): void {
		el.style.setProperty('view-transition-name', `se-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
		el.style.setProperty('view-transition-class', SHARED_CLASS);
		this.named.add(el);
	}

	private enabled(): boolean {
		const view = this.document.defaultView;
		return (
			this.document.documentElement.classList.contains('has-vt') &&
			!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		);
	}
}
// #endregion
