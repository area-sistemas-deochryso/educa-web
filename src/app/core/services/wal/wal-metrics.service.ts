import { Injectable, inject, signal, computed } from '@angular/core';
import { logger } from '@core/helpers';
import { environment } from '@config';
import { WalService } from './wal.service';
import { WalClockService } from './wal-clock.service';
import { WalMetrics, WalProcessResult } from './models';

/** Max latency samples to keep for rolling average. */
const MAX_LATENCY_SAMPLES = 50;

/**
 * Development-only metrics service for WAL sync observability.
 * Tracks commit/failure rates, latency, entry age, and estimated size.
 * All metrics are exposed as signals for a debug panel.
 *
 * NOTE: Does NOT inject WalSyncEngine to avoid circular dependency (NG0200).
 * Instead, WalSyncEngine pushes results via recordProcessResult().
 */
@Injectable({ providedIn: 'root' })
export class WalMetricsService {
	// #region Dependencies

	private wal = inject(WalService);
	private clockService = inject(WalClockService);

	// #endregion

	// #region Private State

	private readonly _totalProcessed = signal(0);
	private readonly _totalCommits = signal(0);
	private readonly _totalFailures = signal(0);
	private readonly _totalConflicts = signal(0);
	private readonly _totalCoalesced = signal(0);
	private readonly _latencySamples: number[] = [];

	// #endregion

	// #region Public Metrics

	/** Current metrics snapshot. */
	readonly metrics = computed<WalMetrics>(() => ({
		totalProcessed: this._totalProcessed(),
		totalCommits: this._totalCommits(),
		totalFailures: this._totalFailures(),
		totalConflicts: this._totalConflicts(),
		avgLatencyMs: this.calculateAvgLatency(),
		oldestPendingAgeMs: 0, // Updated async via refresh
		estimatedSizeBytes: 0, // Updated async via refresh
		clockSkewMs: this.clockService.skewMs(),
		totalCoalesced: this._totalCoalesced(),
	}));

	// Async-updated values exposed as individual signals
	private readonly _oldestPendingAgeMs = signal(0);
	private readonly _estimatedSizeBytes = signal(0);

	readonly oldestPendingAgeMs = this._oldestPendingAgeMs.asReadonly();
	readonly estimatedSizeBytes = this._estimatedSizeBytes.asReadonly();

	// #endregion

	// #region Initialization

	constructor() {
		if (!environment.production) {
			logger.log('[WAL-Metrics] Tracking started (development mode)');
		}
	}

	// #endregion

	// #region Recording

	/**
	 * Record a processed WAL entry result.
	 * Called by WalSyncEngine after each entry is processed.
	 */
	recordProcessResult(result: WalProcessResult): void {
		if (environment.production) return;

		this._totalProcessed.update((n) => n + 1);

		switch (result.status) {
			case 'COMMITTED':
				this._totalCommits.update((n) => n + 1);
				break;
			case 'FAILED':
				this._totalFailures.update((n) => n + 1);
				break;
			case 'CONFLICT':
				this._totalConflicts.update((n) => n + 1);
				break;
		}
	}

	/**
	 * Record a sync latency sample (ms from entry creation to commit).
	 */
	recordLatency(latencyMs: number): void {
		this._latencySamples.push(latencyMs);
		if (this._latencySamples.length > MAX_LATENCY_SAMPLES) {
			this._latencySamples.shift();
		}
	}

	/**
	 * Record a coalescence event.
	 */
	recordCoalescence(): void {
		this._totalCoalesced.update((n) => n + 1);
	}

	// #endregion

	// #region Refresh

	/**
	 * Refresh async metrics (oldest pending age, estimated size).
	 * Called periodically or on demand.
	 */
	async refreshAsyncMetrics(): Promise<void> {
		if (environment.production) return;

		try {
			const pending = await this.wal.getPendingEntries();
			const now = Date.now();

			// Oldest pending age
			if (pending.length > 0) {
				const oldest = pending.reduce((min, e) =>
					e.timestamp < min.timestamp ? e : min,
				);
				this._oldestPendingAgeMs.set(now - oldest.timestamp);
			} else {
				this._oldestPendingAgeMs.set(0);
			}

			// Estimated size (rough JSON serialization size)
			const allEntries = await this.wal.getFailedEntries();
			const allPending = pending;
			const totalEntries = [...allPending, ...allEntries];
			const estimatedSize = totalEntries.reduce((sum, entry) => {
				return sum + new Blob([JSON.stringify(entry)]).size;
			}, 0);
			this._estimatedSizeBytes.set(estimatedSize);
		} catch {
			// Non-critical
		}
	}

	// #endregion

	// #region Helpers

	private calculateAvgLatency(): number {
		if (this._latencySamples.length === 0) return 0;
		const sum = this._latencySamples.reduce((a, b) => a + b, 0);
		return Math.round(sum / this._latencySamples.length);
	}

	// #endregion
}
