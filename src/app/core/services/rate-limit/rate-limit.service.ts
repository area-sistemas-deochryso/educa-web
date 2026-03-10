import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import { logger } from '@core/helpers';

/**
 * Global rate-limit cooldown state.
 *
 * When a 429 is received, this service activates a cooldown period.
 * During cooldown ALL API requests are blocked by the rateLimitInterceptor.
 * The countdown ticks every second so the UI can show remaining time.
 */
@Injectable({ providedIn: 'root' })
export class RateLimitService {
	private readonly zone = inject(NgZone);

	// #region Estado privado
	private readonly _remainingSeconds = signal(0);
	private intervalId: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Lecturas públicas
	/** Seconds remaining until cooldown ends. 0 = no cooldown active. */
	readonly remainingSeconds = this._remainingSeconds.asReadonly();

	/** Whether the app is currently in rate-limit cooldown. */
	readonly isCoolingDown = computed(() => this._remainingSeconds() > 0);
	// #endregion

	// #region Comandos

	/**
	 * Activate cooldown for `seconds` duration.
	 * If already cooling down, extends to the longer of current or new.
	 */
	activateCooldown(seconds: number): void {
		const effectiveSeconds = Math.max(seconds, 5);
		const current = this._remainingSeconds();

		if (effectiveSeconds <= current) return;

		logger.warn(`[RateLimitService] Cooldown activado: ${effectiveSeconds}s`);
		this._remainingSeconds.set(effectiveSeconds);
		this.startCountdown();
	}

	// #endregion

	// #region Helpers privados

	private startCountdown(): void {
		if (this.intervalId !== null) return;

		// Run outside Angular zone to avoid unnecessary change detection per tick
		this.zone.runOutsideAngular(() => {
			this.intervalId = setInterval(() => {
				const current = this._remainingSeconds();
				if (current <= 1) {
					this.stopCountdown();
					// Update signal inside zone so UI picks it up
					this.zone.run(() => this._remainingSeconds.set(0));
					logger.log('[RateLimitService] Cooldown finalizado');
				} else {
					// Signal updates are zone-independent, but we run in zone
					// every 5s to batch UI updates (avoid 1 CD cycle per second)
					this._remainingSeconds.set(current - 1);
				}
			}, 1_000);
		});
	}

	private stopCountdown(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	// #endregion
}
