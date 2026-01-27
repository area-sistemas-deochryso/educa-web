import { BehaviorSubject, Subject } from 'rxjs';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';

export interface CacheUpdateEvent {
	url: string;
	originalUrl: string;
	data: unknown;
}

@Injectable({
	providedIn: 'root',
})
export class SwService {
	private platformId = inject(PLATFORM_ID);
	private registration: ServiceWorkerRegistration | null = null;

	private _isOnline = new BehaviorSubject<boolean>(true);
	private _isRegistered = new BehaviorSubject<boolean>(false);
	private _updateAvailable = new BehaviorSubject<boolean>(false);
	private _cacheUpdated = new Subject<CacheUpdateEvent>();

	isOnline$ = this._isOnline.asObservable();
	isRegistered$ = this._isRegistered.asObservable();
	updateAvailable$ = this._updateAvailable.asObservable();
	/** Emite cuando el SW actualiza el caché en background con datos nuevos */
	cacheUpdated$ = this._cacheUpdated.asObservable();

	get isOnline(): boolean {
		return this._isOnline.value;
	}

	get isRegistered(): boolean {
		return this._isRegistered.value;
	}

	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initOnlineStatus();
			this.registerServiceWorker();
		}
	}

	private initOnlineStatus(): void {
		this._isOnline.next(navigator.onLine);

		window.addEventListener('online', () => {
			logger.log('[SwService] Conexión restaurada');
			this._isOnline.next(true);
		});

		window.addEventListener('offline', () => {
			logger.log('[SwService] Sin conexión - usando cache');
			this._isOnline.next(false);
		});
	}

	private async registerServiceWorker(): Promise<void> {
		if (!('serviceWorker' in navigator)) {
			logger.warn('[SwService] Service Workers no soportados en este navegador');
			return;
		}

		if (!location.pathname.startsWith('/intranet/')) return;

		try {
			this.registration = await navigator.serviceWorker.register('/intranet/sw.js', {
				scope: '/intranet/',
			});

			logger.log('[SwService] Service Worker registrado:', this.registration.scope);
			this._isRegistered.next(true);

			// Verificar actualizaciones
			this.registration.addEventListener('updatefound', () => {
				const newWorker = this.registration?.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							logger.log('[SwService] Nueva versión disponible');
							this._updateAvailable.next(true);
						}
					});
				}
			});

			// Escuchar mensajes del Service Worker
			navigator.serviceWorker.addEventListener('message', (event) => {
				logger.log('[SwService] Mensaje del SW:', event.data);
				this.handleSwMessage(event.data);
			});
		} catch (error) {
			logger.error('[SwService] Error al registrar Service Worker:', error);
		}
	}

	private handleSwMessage(data: { type: string; payload?: unknown }): void {
		if (!data?.type) return;

		switch (data.type) {
			case 'CACHE_UPDATED': {
				const payload = data.payload as CacheUpdateEvent;
				if (payload) {
					logger.log('[SwService] Caché actualizado para:', payload.url);
					this._cacheUpdated.next(payload);
				}
				break;
			}
		}
	}

	async clearCache(): Promise<void> {
		if (this.registration?.active) {
			this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
			logger.log('[SwService] Cache limpiado');
		}
	}

	async update(): Promise<void> {
		if (this.registration) {
			await this.registration.update();
			if (this.registration.waiting) {
				this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
				window.location.reload();
			}
		}
	}

	async unregister(): Promise<boolean> {
		if (this.registration) {
			const result = await this.registration.unregister();
			if (result) {
				this._isRegistered.next(false);
				logger.log('[SwService] Service Worker desregistrado');
			}
			return result;
		}
		return false;
	}
}
