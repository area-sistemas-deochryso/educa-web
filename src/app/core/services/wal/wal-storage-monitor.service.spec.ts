// * Tests for WalStorageMonitor — storage-cap freeze/unfreeze (WAL storage cap).
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { WalStorageMonitor } from './wal-storage-monitor.service';
import { WalDbService } from './wal-db.service';
import { WalStatusStore } from './wal-status.store';

function setup(getStorageUsageRatio: () => Promise<number | null>): {
	monitor: WalStorageMonitor;
	store: WalStatusStore;
} {
	TestBed.configureTestingModule({
		providers: [
			WalStorageMonitor,
			WalStatusStore,
			{
				provide: WalDbService,
				useValue: { getStorageUsageRatio: vi.fn(getStorageUsageRatio) },
			},
		],
	});

	return {
		monitor: TestBed.inject(WalStorageMonitor),
		store: TestBed.inject(WalStatusStore),
	};
}

describe('WalStorageMonitor', () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it('sets mode to frozen when usage crosses the 80% threshold', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.85));
		store.setMode('persistent');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('frozen');
	});

	it('does not freeze when usage is under the threshold', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.5));
		store.setMode('persistent');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('persistent');
	});

	it('unfreezes back to persistent once usage drops below the threshold', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.5));
		store.setMode('frozen');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('persistent');
	});

	it('does NOT override ephemeral mode when usage is low', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.1));
		store.setMode('ephemeral');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('ephemeral');
	});

	it('does NOT override ephemeral mode when usage is high (IndexedDB failure takes priority)', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.95));
		store.setMode('ephemeral');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('ephemeral');
	});

	it('is a no-op when the ratio cannot be determined (null)', async () => {
		const { monitor, store } = setup(() => Promise.resolve(null));
		store.setMode('persistent');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('persistent');
	});

	it('treats exactly the threshold value as full (>= 0.8)', async () => {
		const { monitor, store } = setup(() => Promise.resolve(0.8));
		store.setMode('persistent');

		await monitor.checkAndUpdate();

		expect(store.mode()).toBe('frozen');
	});
});
