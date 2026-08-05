// #region Imports
import { Injectable, effect, signal } from '@angular/core';
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

/**
 * Contenido de prueba en memoria (brief 524, F1+F2) — F3/F4 lo reemplazan por contenido real
 * por ancla. Ningún elemento del codebase declara `data-info-anchor` todavía (eso lo fuerza la
 * regla de mantenimiento de F5); hasta entonces, cualquier click real resuelve al callout
 * genérico — comportamiento esperado, cubierto por `informative-mode.service.spec.ts`.
 */
const TEST_CONTENT = new Map<string, string>([['sample-anchor', 'Explicación de prueba para F1+F2 (sin conexión a contenido real todavía).']]);
// #endregion

// #region Implementation
/**
 * Modo global de sesión (brief 524, plan xrepo-96 F1+F2): mientras está activo, un listener
 * en fase de captura sobre `document` bloquea el click/tap por defecto de cualquier elemento
 * (salvo el FAB y el propio callout) y muestra una explicación en su lugar. Mantener presionado
 * ≥{@link HOLD_BYPASS_MS} bypasea la intercepción y ejecuta la acción original (hallazgo
 * post-524: sin esto, un dropdown que abre/cierra al click queda imposible de operar).
 *
 * Persistencia deliberadamente **solo en memoria** (a diferencia de `ThemeService`): el plan
 * lo define como estado de sesión, no como preferencia de dispositivo — un F5 lo apaga.
 */
@Injectable({ providedIn: 'root' })
export class InformativeModeService {
	// #region State
	private readonly _active = signal(false);
	readonly active = this._active.asReadonly();

	private readonly _currentCallout = signal<InformativeCallout | null>(null);
	readonly currentCallout = this._currentCallout.asReadonly();
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
		const text = (key && TEST_CONTENT.get(key)) ?? GENERIC_MESSAGE;
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
			}
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
	// #endregion
}
// #endregion
