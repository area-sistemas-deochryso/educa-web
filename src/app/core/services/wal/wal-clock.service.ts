import { Injectable, inject, signal, computed } from '@angular/core';
import { logger } from '@core/helpers';
import { WAL_DEFAULTS } from './models';

/**
 * Detects clock skew between client and server using HTTP Date headers.
 * WAL entries and cache TTL rely on Date.now(). If the device clock
 * is significantly wrong, timestamps become unreliable.
 *
 * Usage: call `recordServerTime()` from an HTTP interceptor or
 * after any API response that includes a Date header.
 */
@Injectable({ providedIn: 'root' })
export class WalClockService {
	// #region State

	/** Clock skew delta in ms (server - local). Positive = local is behind. */
	private readonly _skewMs = signal(0);
	/** Whether a significant clock skew has been detected. */
	private readonly _hasSkew = signal(false);
	/** Number of samples collected. */
	private sampleCount = 0;
	/** Running average delta. */
	private runningDelta = 0;

	// #endregion

	// #region Public API

	/** Current clock skew in ms. */
	readonly skewMs = this._skewMs.asReadonly();
	/** True if clock skew exceeds threshold. */
	readonly hasSkew = this._hasSkew.asReadonly();
	/** Adjusted timestamp accounting for clock skew. */
	readonly adjustedNow = computed(() => Date.now() + this._skewMs());

	/**
	 * Record a server timestamp from an HTTP Date header.
	 * Calculates delta and updates running average.
	 *
	 * @param serverDateHeader Value of the HTTP `Date` header.
	 */
	recordServerTime(serverDateHeader: string): void {
		const serverTime = new Date(serverDateHeader).getTime();
		if (isNaN(serverTime)) return;

		const localTime = Date.now();
		const delta = serverTime - localTime;

		// Exponential moving average (alpha = 0.3 for recent bias)
		this.sampleCount++;
		if (this.sampleCount === 1) {
			this.runningDelta = delta;
		} else {
			this.runningDelta = 0.3 * delta + 0.7 * this.runningDelta;
		}

		const roundedDelta = Math.round(this.runningDelta);
		this._skewMs.set(roundedDelta);

		const absDelta = Math.abs(roundedDelta);
		const wasSkewed = this._hasSkew();
		const isSkewed = absDelta > WAL_DEFAULTS.CLOCK_SKEW_THRESHOLD_MS;
		this._hasSkew.set(isSkewed);

		// Log only on state change
		if (isSkewed && !wasSkewed) {
			const direction = roundedDelta > 0 ? 'behind' : 'ahead';
			const minutes = Math.round(absDelta / 60_000);
			logger.warn(
				`[WAL-Clock] Device clock is ~${minutes}min ${direction} server time. WAL timestamps may be inaccurate.`,
			);
		} else if (!isSkewed && wasSkewed) {
			logger.log('[WAL-Clock] Clock skew resolved');
		}
	}

	/**
	 * Get a timestamp adjusted for clock skew.
	 * Use this instead of Date.now() for WAL-critical timestamps.
	 */
	now(): number {
		return Date.now() + this._skewMs();
	}

	// #endregion
}
