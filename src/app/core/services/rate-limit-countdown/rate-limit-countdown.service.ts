import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, NgZone, computed, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';

/**
 * Countdown informativo para respuestas 429 del backend.
 *
 * - Solo informa: NO bloquea requests, NO sintetiza errores. Los callers
 *   reciben el 429 y deciden su UX local.
 * - Si llegan múltiples 429 durante un countdown activo, se queda con el mayor
 *   tiempo restante (más conservador).
 * - El tick corre fuera de la zona Angular — actualiza el signal solo cuando
 *   toca (1 vez por segundo).
 */
@Injectable({ providedIn: 'root' })
export class RateLimitCountdownService {
	// #region Dependencias
	private readonly zone = inject(NgZone);
	// #endregion

	// #region Estado privado
	private readonly _remaining = signal<number>(0);
	private readonly _endpoint = signal<string | null>(null);
	private intervalId: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Lecturas públicas
	readonly remaining = this._remaining.asReadonly();
	readonly endpoint = this._endpoint.asReadonly();
	readonly isActive = computed(() => this._remaining() > 0);
	// #endregion

	// #region Defaults
	private static readonly DEFAULT_COOLDOWN_SECONDS = 60;
	// #endregion

	// #region Comandos

	/**
	 * Activa countdown para `seconds` y registra el endpoint que disparó el 429.
	 * Si ya hay uno activo, extiende al mayor.
	 */
	start(seconds: number, endpoint: string): void {
		const safe = Math.max(seconds, 1);
		if (safe <= this._remaining()) return;

		logger.warn(`[RateLimitCountdown] ${safe}s — ${endpoint}`);
		this._remaining.set(safe);
		this._endpoint.set(endpoint);
		this.startTick();
	}

	/**
	 * Cancela manualmente el countdown (útil para tests o cierres forzados).
	 */
	stop(): void {
		this.stopTick();
		this._remaining.set(0);
		this._endpoint.set(null);
	}

	// #endregion

	// #region Parseo de Retry-After

	/**
	 * Extrae el tiempo de espera del header `Retry-After` o del body
	 * (`retryAfterSeconds`). Devuelve el default si ambos fallan.
	 */
	static parseRetryAfter(error: HttpErrorResponse): number {
		const headerValue = error.headers?.get('Retry-After');
		if (headerValue) {
			const parsed = parseInt(headerValue, 10);
			if (!isNaN(parsed) && parsed > 0) return parsed;
		}

		const body = error.error as Record<string, unknown> | null;
		if (body?.['retryAfterSeconds']) {
			const bodyValue = Number(body['retryAfterSeconds']);
			if (!isNaN(bodyValue) && bodyValue > 0) return bodyValue;
		}

		return RateLimitCountdownService.DEFAULT_COOLDOWN_SECONDS;
	}

	// #endregion

	// #region Tick privado

	private startTick(): void {
		if (this.intervalId !== null) return;

		this.zone.runOutsideAngular(() => {
			this.intervalId = setInterval(() => {
				const curr = this._remaining();
				if (curr <= 1) {
					this.stopTick();
					this.zone.run(() => {
						this._remaining.set(0);
						this._endpoint.set(null);
					});
				} else {
					this._remaining.set(curr - 1);
				}
			}, 1_000);
		});
	}

	private stopTick(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	// #endregion
}
