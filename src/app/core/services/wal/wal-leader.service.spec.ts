// * Tests for WalLeaderService — leader election tie-break (F1 point 4).
import { Injector, PLATFORM_ID } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalLeaderService } from './wal-leader.service';

type Handler = (event: MessageEvent) => void;

class FakeChannel {
	static instances: FakeChannel[] = [];
	onmessage: Handler | null = null;
	closed = false;

	constructor(readonly name: string) {
		FakeChannel.instances.push(this);
	}

	postMessage(msg: unknown): void {
		for (const other of FakeChannel.instances) {
			if (other !== this && !other.closed) {
				other.onmessage?.({ data: msg } as MessageEvent);
			}
		}
	}

	close(): void {
		this.closed = true;
	}
}

/**
 * Creates an independent WalLeaderService instance — simulates a separate browser tab.
 * Uses its own `Injector.create` (not a shared `DestroyRef` stub — Angular special-cases
 * `DestroyRef` resolution per-injector, so `destroy()` maps to `injector.destroy()`).
 */
function createTab(tabId: string): { service: WalLeaderService; destroy: () => void } {
	const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(tabId as `${string}-${string}-${string}-${string}-${string}`);
	const injector = Injector.create({
		providers: [WalLeaderService, { provide: PLATFORM_ID, useValue: 'browser' }],
	});
	const service = injector.get(WalLeaderService);
	uuidSpy.mockRestore();
	return {
		service,
		destroy: () => injector.destroy(),
	};
}

describe('WalLeaderService', () => {
	const originalBroadcastChannel = globalThis.BroadcastChannel;

	beforeEach(() => {
		FakeChannel.instances = [];
		(globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
		vi.useFakeTimers();
	});

	afterEach(() => {
		(globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcastChannel;
		vi.useRealTimers();
	});

	it('only one of two tabs starting simultaneously ends up leader after the grace period', () => {
		const tabA = createTab('aaaaaaaa-0000-0000-0000-000000000000');
		const tabB = createTab('bbbbbbbb-0000-0000-0000-000000000000');

		// Both tabs claim near-simultaneously, before either finalizes.
		tabA.service.start();
		tabB.service.start();

		// Mid-grace-period: neither has finalized leadership yet.
		expect(tabA.service.isLeader).toBe(false);
		expect(tabB.service.isLeader).toBe(false);

		vi.advanceTimersByTime(300);

		const leaders = [tabA.service.isLeader, tabB.service.isLeader].filter(Boolean);
		expect(leaders).toHaveLength(1);
	});

	it('a tab claiming while another is already leader (heartbeating) backs off instead of double-processing', () => {
		// tabA has the lexicographically smaller id — it wins every tie-break.
		const tabA = createTab('aaaaaaaa-0000-0000-0000-000000000000');
		tabA.service.start();
		vi.advanceTimersByTime(300);
		expect(tabA.service.isLeader).toBe(true);

		const tabB = createTab('bbbbbbbb-0000-0000-0000-000000000000');
		tabB.service.start();

		// tabA's heartbeat fires before tabB's grace period elapses.
		vi.advanceTimersByTime(3_000);

		expect(tabA.service.isLeader).toBe(true);
		expect(tabB.service.isLeader).toBe(false);
	});

	it('resigns leadership and cleans up timers on destroy', () => {
		const tab = createTab('cccccccc-0000-0000-0000-000000000000');
		tab.service.start();
		vi.advanceTimersByTime(300);
		expect(tab.service.isLeader).toBe(true);

		tab.destroy();
		expect(tab.service.isLeader).toBe(false);
	});

	it('becomes leader immediately when BroadcastChannel is unavailable (single-tab fallback)', () => {
		(globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = undefined;
		const tab = createTab('dddddddd-0000-0000-0000-000000000000');

		tab.service.start();

		expect(tab.service.isLeader).toBe(true);
		tab.destroy();
	});

	it('follower takes over via RELEASE when the leader tab closes', () => {
		const tabA = createTab('aaaaaaaa-0000-0000-0000-000000000000');
		tabA.service.start();
		vi.advanceTimersByTime(300);
		expect(tabA.service.isLeader).toBe(true);

		const tabB = createTab('bbbbbbbb-0000-0000-0000-000000000000');
		tabB.service.start();
		vi.advanceTimersByTime(3_000);
		expect(tabB.service.isLeader).toBe(false);

		// Leader closes → teardown broadcasts RELEASE → follower claims.
		tabA.destroy();
		expect(tabA.service.isLeader).toBe(false);
		vi.advanceTimersByTime(400);
		expect(tabB.service.isLeader).toBe(true);

		tabB.destroy();
	});

	it('follower claims leadership when the leader goes silent (heartbeat timeout, no RELEASE)', () => {
		const tabA = createTab('aaaaaaaa-0000-0000-0000-000000000000');
		tabA.service.start();
		vi.advanceTimersByTime(300);
		expect(tabA.service.isLeader).toBe(true);

		const tabB = createTab('bbbbbbbb-0000-0000-0000-000000000000');
		tabB.service.start();
		vi.advanceTimersByTime(3_000);
		expect(tabB.service.isLeader).toBe(false);

		// Simulate a dead leader that never sent RELEASE: partition tabB so it
		// stops receiving heartbeats (last one seen ~t=3000ms).
		const tabBChannel = FakeChannel.instances[1];
		tabBChannel.close();

		// leaderCheck fires every 9000ms; first check after partition sees
		// elapsed < timeout, the next one past it claims leadership.
		vi.advanceTimersByTime(16_000);
		expect(tabB.service.isLeader).toBe(true);

		tabA.destroy();
		tabB.destroy();
	});
});
