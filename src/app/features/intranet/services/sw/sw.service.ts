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
	/** Emite cuando el SW actualiza el cachÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© en background con datos nuevos */
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
			logger.log('[SwService] ConexiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n restaurada');
			this._isOnline.next(true);
		});

		window.addEventListener('offline', () => {
			logger.log('[SwService] Sin conexiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n - usando cache');
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
			//? Indica el path y el scope del sw en la build
			this.registration = await navigator.serviceWorker.register('/sw.js', {
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
							logger.log('[SwService] Nueva versiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n disponible');
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
					logger.log('[SwService] CachÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© actualizado para:', payload.url);
					this._cacheUpdated.next(payload);
				}
				break;
			}
		}
	}

	// #region InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de cache

	/**
	 * PROPÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“SITO: Prevenir errores cuando el backend cambia la estructura de datos
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Cuando el backend modifica la estructura de un DTO (agregar/quitar campos, cambiar tipos),
	 * el cache offline guarda datos con la estructura antigua. La primera peticiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n falla porque
	 * el frontend intenta deserializar datos incompatibles con los nuevos tipos.
	 *
	 * SOLUCIÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N:
	 * Limpiar TODO el cache para forzar refetch completo con la nueva estructura.
	 * Usar en logout o cuando hay cambios breaking globales en la API.
	 *
	 * EJEMPLO: Cambios en DTOs de autenticaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n, permisos, o estructura base de la app.
	 */
	async clearCache(): Promise<void> {
		if (this.registration?.active) {
			this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
			logger.log('[SwService] Cache limpiado completamente');
		}
	}

	/**
	 * PROPÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“SITO: InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica cuando un endpoint especÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­fico cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Evitar limpiar todo el cache cuando solo un endpoint cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ su estructura.
	 * Mantiene el cache de otros endpoints intacto para mejor performance.
	 *
	 * SOLUCIÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N:
	 * Invalidar solo la URL exacta que cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³, preservando el resto del cache.
	 * El prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ximo fetch a esa URL irÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ directo al servidor y obtendrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ la nueva estructura.
	 *
	 * EJEMPLO: El endpoint /api/usuarios/123 cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ su estructura de respuesta,
	 * pero /api/asistencias sigue igual.
	 *
	 * @param url - URL exacta a invalidar (serÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ normalizada por el SW)
	 */
	async invalidateCacheByUrl(url: string): Promise<void> {
		if (!this.registration?.active) {
			logger.warn('[SwService] No hay SW activo para invalidar cache');
			return;
		}

		return new Promise((resolve) => {
			const messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = (event) => {
				if (event.data.success) {
					logger.log('[SwService] Cache invalidado para URL:', url);
				}
				resolve();
			};

			this.registration!.active!.postMessage(
				{
					type: 'INVALIDATE_BY_URL',
					payload: { url },
				},
				[messageChannel.port2]
			);

			// Timeout fallback
			setTimeout(resolve, 1000);
		});
	}

	/**
	 * PROPÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“SITO: InvalidaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n por mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo cuando un conjunto de endpoints relacionados cambiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Cuando se modifica la lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³gica de un mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo completo (ej: asistencias, reportes),
	 * mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºltiples endpoints cambian su estructura simultÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡neamente. Invalidar uno por uno
	 * es tedioso y propenso a errores (olvidar alguno).
	 *
	 * SOLUCIÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N:
	 * Invalidar todas las URLs que contengan un patrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n comÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºn (ej: "/api/ConsultaAsistencia").
	 * Esto limpia todo el cache del mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³dulo afectado en una sola operaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n.
	 *
	 * EJEMPLO: Cambios en estructura de asistencias:
	 * - /api/ConsultaAsistencia/profesor/asistencia-dia
	 * - /api/ConsultaAsistencia/director/asistencia-dia
	 * - /api/ConsultaAsistencia/director/reporte/todos-salones/mes
	 * Todas se invalidan con pattern: "/api/ConsultaAsistencia"
	 *
	 * @param pattern - PatrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n a buscar en las URLs (ej: "/api/ConsultaAsistencia")
	 * @returns NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de entradas invalidadas (ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºtil para logging/debug)
	 */
	async invalidateCacheByPattern(pattern: string): Promise<number> {
		if (!this.registration?.active) {
			logger.warn('[SwService] No hay SW activo para invalidar cache');
			return 0;
		}

		return new Promise((resolve) => {
			const messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = (event) => {
				const count = event.data.count || 0;
				if (event.data.success) {
					logger.log(`[SwService] Cache invalidado: ${count} entradas con patrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n "${pattern}"`);
				}
				resolve(count);
			};

			this.registration!.active!.postMessage(
				{
					type: 'INVALIDATE_BY_PATTERN',
					payload: { pattern },
				},
				[messageChannel.port2]
			);

			// Timeout fallback
			setTimeout(() => resolve(0), 1000);
		});
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
	// #endregion
}
