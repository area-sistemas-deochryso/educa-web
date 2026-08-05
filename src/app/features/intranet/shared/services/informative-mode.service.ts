// #region Imports
import { Injectable, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { InformativeContentService } from '@core/services/informative-mode';
import { logger } from '@core/helpers';
// #endregion

// #region Helpers
interface InformativeCallout {
	text: string;
	rect: DOMRect;
}

/** Selectores exentos de la intercepción: el FAB (única salida del modo) y el propio callout. */
const EXEMPT_SELECTOR = 'app-intranet-fab-menu, app-informative-mode-callout';

const GENERIC_MESSAGE = 'Todavía no hay una explicación cargada para este elemento.';

/**
 * Umbral (ms) de mantener presionado para que el click bypasee la intercepción y ejecute la
 * acción original — sin esto, un elemento que despliega/oculta un sub-elemento al click (ej.
 * un dropdown) queda imposible de operar mientras el modo está activo (hallazgo post-524).
 */
const HOLD_BYPASS_MS = 500;
// #endregion

// #region Implementation
/**
 * Modo global de sesión (brief 524/526, plan xrepo-96 F1+F2+F4): mientras está activo, un
 * listener en fase de captura sobre `document` bloquea el click/tap por defecto de cualquier
 * elemento (salvo el FAB y el propio callout) y muestra una explicación en su lugar. Mantener
 * presionado ≥{@link HOLD_BYPASS_MS} bypasea la intercepción y ejecuta la acción original
 * (hallazgo post-524: sin esto, un dropdown que abre/cierra al click queda imposible de operar).
 *
 * El contenido explicativo (F4) se resuelve contra el backend por ancla: al activar el modo y
 * en cada navegación mientras sigue activo, se escanea el DOM renderizado por
 * `[data-info-anchor]` y se piden en un solo batch las claves únicas presentes en la vista
 * actual. El resultado se cachea en memoria hasta la próxima activación/navegación — no hace
 * falta invalidación más sofisticada para esta fase (ver Cierre del brief 526).
 *
 * Persistencia deliberadamente **solo en memoria** (a diferencia de `ThemeService`): el plan
 * lo define como estado de sesión, no como preferencia de dispositivo — un F5 lo apaga.
 */
@Injectable({ providedIn: 'root' })
export class InformativeModeService {
	private readonly router = inject(Router);
	private readonly contentApi = inject(InformativeContentService);

	// #region State
	private readonly _active = signal(false);
	readonly active = this._active.asReadonly();

	private readonly _currentCallout = signal<InformativeCallout | null>(null);
	readonly currentCallout = this._currentCallout.asReadonly();

	private readonly _content = signal<ReadonlyMap<string, string>>(new Map());

	private readonly navigationEnd = toSignal(
		this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
		{ initialValue: null },
	);
	// #endregion

	// `null` = sin pointerdown previo registrado para este click (ej. activación por teclado,
	// Enter/Space sobre un botón enfocado) — debe tratarse como click corto, nunca como hold.
	private pointerDownAt: number | null = null;

	private readonly onDocumentPointerDown = (): void => {
		this.pointerDownAt = Date.now();
	};

	private readonly onDocumentClick = (event: MouseEvent): void => {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest(EXEMPT_SELECTOR)) return;

		// Hold-to-bypass: mantener presionado ≥HOLD_BYPASS_MS antes de soltar deja pasar el
		// click normal, sin salir del modo — necesario para operar elementos cuyo estado
		// (dropdown abierto/cerrado) el modo informativo no debe pisar.
		const held = this.pointerDownAt !== null && Date.now() - this.pointerDownAt >= HOLD_BYPASS_MS;
		this.pointerDownAt = null;
		if (held) return;

		event.preventDefault();
		event.stopPropagation();

		const anchorEl = target.closest<HTMLElement>('[data-info-anchor]');
		const key = anchorEl?.dataset['infoAnchor'] ?? null;
		const text = (key && this._content().get(key)) ?? GENERIC_MESSAGE;
		this._currentCallout.set({ text, rect: (anchorEl ?? target).getBoundingClientRect() });
	};

	constructor() {
		effect(() => {
			if (this.active()) {
				document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
				document.addEventListener('click', this.onDocumentClick, true);
				this.closeOpenOverlays();
			} else {
				document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
				document.removeEventListener('click', this.onDocumentClick, true);
				this._currentCallout.set(null);
				this.pointerDownAt = null;
				this._content.set(new Map());
			}
		});

		// Re-escanea y re-pide el contenido al activar el modo y en cada navegación subsiguiente
		// mientras sigue activo — las anclas presentes en el DOM cambian de página a página.
		effect(() => {
			const active = this.active();
			this.navigationEnd(); // dependencia de tracking: dispara el efecto en cada NavigationEnd
			if (!active) return;
			void this.refreshContent();
		});
	}

	/**
	 * @example
	 * this.informativeMode.toggle();
	 */
	toggle(): void {
		this._active.update((v) => !v);
	}

	dismissCallout(): void {
		this._currentCallout.set(null);
	}

	// #region Private helpers
	/**
	 * Sin `OverlayService`/`DomHandler` genérico invocable en el codebase (pre-work del brief
	 * 524): simula `Escape`, que PrimeNG respeta por defecto (`closeOnEscape`) en `p-dialog`,
	 * `p-drawer` y dropdowns — cierra overlays abiertos sin acoplarse a cada tipo.
	 */
	private closeOpenOverlays(): void {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
	}

	/** Claves únicas de `[data-info-anchor]` presentes en la vista actualmente renderizada. */
	private scanAnchors(): string[] {
		const elements = document.querySelectorAll<HTMLElement>('[data-info-anchor]');
		const keys = new Set<string>();
		elements.forEach((el) => {
			const key = el.dataset['infoAnchor'];
			if (key) keys.add(key);
		});
		return [...keys];
	}

	/**
	 * Pide al backend el texto resuelto (default+override por rol) de las anclas presentes en
	 * la vista actual, en un solo batch. Sin anclas en la vista, no hay nada que pedir. Un fallo
	 * de red no rompe el modo — el interceptor cae al mensaje genérico para cualquier click.
	 */
	private async refreshContent(): Promise<void> {
		const anclas = this.scanAnchors();
		if (anclas.length === 0) {
			this._content.set(new Map());
			return;
		}
		try {
			const resolved = await firstValueFrom(this.contentApi.resolver(anclas));
			this._content.set(new Map(Object.entries(resolved)));
		} catch (err) {
			logger.tagged('InformativeModeService', 'error', 'Falló la resolución de anclas del modo informativo', err);
			this._content.set(new Map());
		}
	}
	// #endregion
}
// #endregion
