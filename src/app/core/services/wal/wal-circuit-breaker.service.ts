import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { WalStatusStore } from './wal-status.store';
import { WAL_DEFAULTS, WalCircuitState } from './models';

/**
 * WAL sync circuit breaker (M2).
 *
 * Tracks consecutive retryable failures and pauses processing when a threshold is hit.
 * After a cooldown, allows a single probe entry to check if the server recovered.
 *
 * Only retryable errors (network, timeout, 5xx) increment the failure counter.
 * Permanent 4xx and 409 conflicts do NOT open the circuit (INV-WAL-RES04).
 */
@Injectable({ providedIn: 'root' })
export class WalCircuitBreaker {
	private store = inject(WalStatusStore);

	/**
	 * True when the engine is allowed to process pending entries.
	 *
	 * In `closed` and `half-open` states the engine processes; in `open` the
	 * cooldown is checked first — if elapsed, transition to `half-open` and
	 * allow processing as a probe.
	 */
	canProcess(now: number = Date.now()): boolean {
		const state = this.store.circuitState();
		if (state === 'closed' || state === 'half-open') return true;

		const openedAt = this.store.circuitOpenedAt();
		if (openedAt !== null && now - openedAt >= WAL_DEFAULTS.CIRCUIT_COOLDOWN_MS) {
			this.transition('half-open');
			return true;
		}
		return false;
	}

	/**
	 * Record a retryable failure. Opens the circuit at threshold.
	 * Caller must already have classified the error as retryable
	 * (see `classifyWalError`).
	 */
	recordFailure(): void {
		const next = this.store.consecutiveFailures() + 1;
		this.store.setConsecutiveFailures(next);

		const state = this.store.circuitState();
		if (state === 'half-open') {
			// Probe failed — back to open for another cooldown.
			this.transition('open');
			return;
		}

		if (state === 'closed' && next >= WAL_DEFAULTS.CIRCUIT_FAILURE_THRESHOLD) {
			this.transition('open');
		}
	}

	/**
	 * Record a successful commit. Closes the circuit if it was probing.
	 * Always resets the consecutive failure counter.
	 */
	recordSuccess(): void {
		this.store.setConsecutiveFailures(0);

		if (this.store.circuitState() !== 'closed') {
			this.transition('closed');
		}
	}

	/**
	 * Force an open circuit into half-open immediately, ignoring the cooldown.
	 * Used by the "Reintentar ahora" UI action (INV-WAL-RES06).
	 * No-op if not currently open.
	 */
	forceProbe(): void {
		if (this.store.circuitState() === 'open') {
			this.transition('half-open');
		}
	}

	private transition(next: WalCircuitState): void {
		const prev = this.store.circuitState();
		if (prev === next) return;

		this.store.setCircuitState(next);
		this.store.setCircuitOpenedAt(next === 'open' ? Date.now() : null);

		if (next === 'open') {
			logger.warn('[WAL-Circuit] open — sync paused after consecutive failures');
		} else if (next === 'half-open') {
			logger.log('[WAL-Circuit] half-open — probing server');
		} else {
			logger.log('[WAL-Circuit] closed — sync resumed');
		}
	}
}
