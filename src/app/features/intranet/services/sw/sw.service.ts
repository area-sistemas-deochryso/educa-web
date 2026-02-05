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

	// ============ Invalidación de cache ============

	/**
	 * PROPÓSITO: Prevenir errores cuando el backend cambia la estructura de datos
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Cuando el backend modifica la estructura de un DTO (agregar/quitar campos, cambiar tipos),
	 * el cache offline guarda datos con la estructura antigua. La primera petición falla porque
	 * el frontend intenta deserializar datos incompatibles con los nuevos tipos.
	 *
	 * SOLUCIÓN:
	 * Limpiar TODO el cache para forzar refetch completo con la nueva estructura.
	 * Usar en logout o cuando hay cambios breaking globales en la API.
	 *
	 * EJEMPLO: Cambios en DTOs de autenticación, permisos, o estructura base de la app.
	 */
	async clearCache(): Promise<void> {
		if (this.registration?.active) {
			this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
			logger.log('[SwService] Cache limpiado completamente');
		}
	}

	/**
	 * PROPÓSITO: Invalidación quirúrgica cuando un endpoint específico cambió
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Evitar limpiar todo el cache cuando solo un endpoint cambió su estructura.
	 * Mantiene el cache de otros endpoints intacto para mejor performance.
	 *
	 * SOLUCIÓN:
	 * Invalidar solo la URL exacta que cambió, preservando el resto del cache.
	 * El próximo fetch a esa URL irá directo al servidor y obtendrá la nueva estructura.
	 *
	 * EJEMPLO: El endpoint /api/usuarios/123 cambió su estructura de respuesta,
	 * pero /api/asistencias sigue igual.
	 *
	 * @param url - URL exacta a invalidar (será normalizada por el SW)
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
	 * PROPÓSITO: Invalidación por módulo cuando un conjunto de endpoints relacionados cambió
	 *
	 * PROBLEMA QUE RESUELVE:
	 * Cuando se modifica la lógica de un módulo completo (ej: asistencias, reportes),
	 * múltiples endpoints cambian su estructura simultáneamente. Invalidar uno por uno
	 * es tedioso y propenso a errores (olvidar alguno).
	 *
	 * SOLUCIÓN:
	 * Invalidar todas las URLs que contengan un patrón común (ej: "/api/ConsultaAsistencia").
	 * Esto limpia todo el cache del módulo afectado en una sola operación.
	 *
	 * EJEMPLO: Cambios en estructura de asistencias:
	 * - /api/ConsultaAsistencia/profesor/asistencia-dia
	 * - /api/ConsultaAsistencia/director/asistencia-dia
	 * - /api/ConsultaAsistencia/director/reporte/todos-salones/mes
	 * Todas se invalidan con pattern: "/api/ConsultaAsistencia"
	 *
	 * @param pattern - Patrón a buscar en las URLs (ej: "/api/ConsultaAsistencia")
	 * @returns Número de entradas invalidadas (útil para logging/debug)
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
					logger.log(`[SwService] Cache invalidado: ${count} entradas con patrón "${pattern}"`);
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
}
