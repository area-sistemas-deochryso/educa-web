import {
	CATEGORY_LABELS,
	KEYBOARD_SHORTCUTS,
	KeyboardShortcut,
	ShortcutCategory,
} from './keyboard-shortcuts.config';
import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';

type ShortcutHandler = () => void;

@Injectable({
	providedIn: 'root',
})
export class KeyboardShortcutsService implements OnDestroy {
	private platformId = inject(PLATFORM_ID);
	private handlers = new Map<string, ShortcutHandler>();
	private boundKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

	/** Atajos registrados */
	readonly shortcuts = KEYBOARD_SHORTCUTS;

	/** Etiquetas de categorías */
	readonly categoryLabels = CATEGORY_LABELS;

	/** Indica si el servicio está activo */
	readonly isActive = signal(false);

	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.init();
		}
	}

	private init(): void {
		this.boundKeydownHandler = this.handleKeydown.bind(this);
		document.addEventListener('keydown', this.boundKeydownHandler);
		this.isActive.set(true);
		logger.log('[Keyboard] Servicio de atajos inicializado');
	}

	private handleKeydown(event: KeyboardEvent): void {
		for (const shortcut of this.shortcuts) {
			if (this.matchesShortcut(event, shortcut)) {
				const handler = this.handlers.get(shortcut.id);
				if (handler) {
					event.preventDefault();
					handler();
					logger.log(`[Keyboard] Atajo ejecutado: ${shortcut.keys}`);
				}
				return;
			}
		}
	}

	private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
		if (shortcut.ctrl !== event.ctrlKey) return false;
		if (shortcut.shift !== event.shiftKey) return false;
		if (shortcut.alt !== event.altKey) return false;

		const eventKey = shortcut.useCode ? event.code : event.key;
		return eventKey === shortcut.key;
	}

	/**
	 * Registra un handler para un atajo específico
	 */
	register(shortcutId: string, handler: ShortcutHandler): void {
		const shortcut = this.shortcuts.find((s) => s.id === shortcutId);
		if (!shortcut) {
			logger.warn(`[Keyboard] Atajo no encontrado: ${shortcutId}`);
			return;
		}

		this.handlers.set(shortcutId, handler);
		logger.log(`[Keyboard] Handler registrado: ${shortcutId} (${shortcut.keys})`);
	}

	/**
	 * Elimina el handler de un atajo
	 */
	unregister(shortcutId: string): void {
		this.handlers.delete(shortcutId);
		logger.log(`[Keyboard] Handler eliminado: ${shortcutId}`);
	}

	/**
	 * Obtiene un atajo por su ID
	 */
	getShortcut(shortcutId: string): KeyboardShortcut | undefined {
		return this.shortcuts.find((s) => s.id === shortcutId);
	}

	/**
	 * Obtiene atajos por categoría
	 */
	getByCategory(category: ShortcutCategory): KeyboardShortcut[] {
		return this.shortcuts.filter((s) => s.category === category);
	}

	/**
	 * Obtiene todas las categorías disponibles
	 */
	getCategories(): ShortcutCategory[] {
		const categories = new Set(this.shortcuts.map((s) => s.category));
		return Array.from(categories);
	}

	/**
	 * Verifica si un atajo tiene handler registrado
	 */
	hasHandler(shortcutId: string): boolean {
		return this.handlers.has(shortcutId);
	}

	ngOnDestroy(): void {
		if (this.boundKeydownHandler) {
			document.removeEventListener('keydown', this.boundKeydownHandler);
		}
		this.handlers.clear();
		this.isActive.set(false);
	}
}
