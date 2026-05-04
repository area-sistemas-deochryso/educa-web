import { Injectable, signal, computed } from '@angular/core';
import { WalCircuitState, WalEntry, WalMode } from './models';

/**
 * Banner message variant rendered by `WalDegradedBanner`.
 * `null` means the banner is hidden.
 */
export type WalBannerMessage = 'circuit-open' | 'ephemeral' | null;

/**
 * Pure reactive state container for WAL status indicators.
 * IO and subscription lifecycle live in WalStatusFacade.
 */
@Injectable({ providedIn: 'root' })
export class WalStatusStore {
	// #region Private State

	private readonly _pendingCount = signal(0);
	private readonly _inFlightCount = signal(0);
	private readonly _failedCount = signal(0);
	private readonly _isSyncing = signal(false);
	private readonly _lastSyncTime = signal<number | null>(null);
	private readonly _failedEntries = signal<WalEntry[]>([]);
	private readonly _migrationCount = signal(0);

	// M2/M3: resilience signals
	private readonly _mode = signal<WalMode>('persistent');
	private readonly _circuitState = signal<WalCircuitState>('closed');
	private readonly _consecutiveFailures = signal(0);
	private readonly _circuitOpenedAt = signal<number | null>(null);

	// #endregion

	// #region Public Readonly

	readonly pendingCount = this._pendingCount.asReadonly();
	readonly failedCount = this._failedCount.asReadonly();
	readonly isSyncing = this._isSyncing.asReadonly();
	readonly lastSyncTime = this._lastSyncTime.asReadonly();
	readonly failedEntries = this._failedEntries.asReadonly();
	readonly migrationCount = this._migrationCount.asReadonly();

	readonly mode = this._mode.asReadonly();
	readonly circuitState = this._circuitState.asReadonly();
	readonly consecutiveFailures = this._consecutiveFailures.asReadonly();
	readonly circuitOpenedAt = this._circuitOpenedAt.asReadonly();

	// #endregion

	// #region Computed

	readonly hasPending = computed(() => this._pendingCount() > 0);
	readonly hasFailures = computed(() => this._failedCount() > 0);
	readonly hasActivity = computed(
		() => this._pendingCount() > 0 || this._inFlightCount() > 0,
	);
	readonly hasMigrations = computed(() => this._migrationCount() > 0);

	/**
	 * True when the WAL is operating in a non-nominal state (M2/M3).
	 * Drives visibility of `WalDegradedBanner`.
	 */
	readonly isDegraded = computed(
		() => this._mode() !== 'persistent' || this._circuitState() === 'open',
	);

	/** Banner variant to render (null = hidden). */
	readonly bannerMessage = computed<WalBannerMessage>(() => {
		if (this._mode() === 'ephemeral' || this._mode() === 'frozen') return 'ephemeral';
		if (this._circuitState() === 'open') return 'circuit-open';
		return null;
	});

	readonly vm = computed(() => ({
		pendingCount: this._pendingCount(),
		inFlightCount: this._inFlightCount(),
		failedCount: this._failedCount(),
		migrationCount: this._migrationCount(),
		isSyncing: this._isSyncing(),
		lastSyncTime: this._lastSyncTime(),
		failedEntries: this._failedEntries(),
		hasPending: this.hasPending(),
		hasFailures: this.hasFailures(),
		hasActivity: this.hasActivity(),
		hasMigrations: this.hasMigrations(),
		mode: this._mode(),
		circuitState: this._circuitState(),
		consecutiveFailures: this._consecutiveFailures(),
		circuitOpenedAt: this._circuitOpenedAt(),
		isDegraded: this.isDegraded(),
		bannerMessage: this.bannerMessage(),
	}));

	// #endregion

	// #region Setters

	setPendingCount(value: number): void {
		this._pendingCount.set(value);
	}

	setInFlightCount(value: number): void {
		this._inFlightCount.set(value);
	}

	setFailedCount(value: number): void {
		this._failedCount.set(value);
	}

	setIsSyncing(value: boolean): void {
		this._isSyncing.set(value);
	}

	setLastSyncTime(value: number | null): void {
		this._lastSyncTime.set(value);
	}

	setFailedEntries(entries: WalEntry[]): void {
		this._failedEntries.set(entries);
	}

	setMigrationCount(value: number): void {
		this._migrationCount.set(value);
	}

	setMode(value: WalMode): void {
		this._mode.set(value);
	}

	setCircuitState(value: WalCircuitState): void {
		this._circuitState.set(value);
	}

	setConsecutiveFailures(value: number): void {
		this._consecutiveFailures.set(value);
	}

	setCircuitOpenedAt(value: number | null): void {
		this._circuitOpenedAt.set(value);
	}

	// #endregion
}
