import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { WalDbService } from './wal-db.service';
import { WalStatusStore } from './wal-status.store';

/** Storage usage ratio (0..1) above which the WAL freezes new writes. */
export const WAL_STORAGE_FULL_THRESHOLD = 0.8;

/**
 * Watches `navigator.storage` usage and toggles {@link WalStatusStore.mode}
 * between `persistent` and `frozen` (INV-WAL-RES storage cap).
 *
 * Has no timer of its own — {@link WalSyncEngine} calls
 * {@link checkAndUpdate} from its existing `SYNC_INTERVAL_MS` timer so we
 * don't add a second periodic subscription for the same lifecycle.
 *
 * Never touches `'ephemeral'` — that mode is set by {@link WalDbService}
 * `bootstrap()` when IndexedDB itself is unavailable, a different failure
 * mode from "storage quota nearly full".
 */
@Injectable({ providedIn: 'root' })
export class WalStorageMonitor {
	private db = inject(WalDbService);
	private statusStore = inject(WalStatusStore);

	private checking = false;

	/**
	 * Estimate storage usage and freeze/unfreeze the WAL accordingly.
	 * No-op (and safe to call concurrently) when a check is already running,
	 * or when `getStorageUsageRatio()` can't determine a ratio.
	 */
	async checkAndUpdate(): Promise<void> {
		if (this.checking) return;
		this.checking = true;

		try {
			const ratio = await this.db.getStorageUsageRatio();
			if (ratio === null) return;

			const mode = this.statusStore.mode();

			// 'ephemeral' is a distinct failure mode (IndexedDB itself is
			// unavailable, handled by WalDbService.bootstrap()) — never
			// transition into or out of it based on storage quota.
			if (mode === 'ephemeral') return;

			if (ratio >= WAL_STORAGE_FULL_THRESHOLD) {
				if (mode !== 'frozen') {
					this.statusStore.setMode('frozen');
					logger.warn(
						`[WAL-Storage] Usage at ${(ratio * 100).toFixed(1)}% (>= ${WAL_STORAGE_FULL_THRESHOLD * 100}%) — freezing WAL writes`,
					);
				}
				return;
			}

			// Only recover from a freeze WE caused — never touch 'ephemeral'.
			if (mode === 'frozen') {
				this.statusStore.setMode('persistent');
				logger.log(
					`[WAL-Storage] Usage back under ${WAL_STORAGE_FULL_THRESHOLD * 100}% — unfreezing WAL writes`,
				);
			}
		} finally {
			this.checking = false;
		}
	}
}
