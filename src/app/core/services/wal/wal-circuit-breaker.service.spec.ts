// * Tests for WalCircuitBreaker — M2 transitions closed/open/half-open.
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalCircuitBreaker } from './wal-circuit-breaker.service';
import { WalStatusStore } from './wal-status.store';
import { WAL_DEFAULTS } from './models';

function setup(): { breaker: WalCircuitBreaker; store: WalStatusStore } {
	TestBed.configureTestingModule({
		providers: [WalCircuitBreaker, WalStatusStore],
	});
	return {
		breaker: TestBed.inject(WalCircuitBreaker),
		store: TestBed.inject(WalStatusStore),
	};
}

describe('WalCircuitBreaker', () => {
	beforeEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('canProcess()', () => {
		it('returns true when state is closed (default)', () => {
			const { breaker, store } = setup();
			expect(store.circuitState()).toBe('closed');
			expect(breaker.canProcess()).toBe(true);
		});

		it('returns false when open and cooldown has not elapsed', () => {
			const { breaker, store } = setup();
			store.setCircuitState('open');
			store.setCircuitOpenedAt(Date.now());
			expect(breaker.canProcess()).toBe(false);
		});

		it('transitions open → half-open and returns true once cooldown elapses', () => {
			const { breaker, store } = setup();
			const t0 = Date.now();
			store.setCircuitState('open');
			store.setCircuitOpenedAt(t0);

			expect(breaker.canProcess(t0 + WAL_DEFAULTS.CIRCUIT_COOLDOWN_MS - 1)).toBe(false);
			expect(store.circuitState()).toBe('open');

			expect(breaker.canProcess(t0 + WAL_DEFAULTS.CIRCUIT_COOLDOWN_MS)).toBe(true);
			expect(store.circuitState()).toBe('half-open');
		});

		it('returns true while in half-open state (probe in flight)', () => {
			const { breaker, store } = setup();
			store.setCircuitState('half-open');
			expect(breaker.canProcess()).toBe(true);
		});
	});

	describe('recordFailure()', () => {
		it('opens the circuit at threshold (default 5)', () => {
			const { breaker, store } = setup();
			for (let i = 0; i < WAL_DEFAULTS.CIRCUIT_FAILURE_THRESHOLD - 1; i++) {
				breaker.recordFailure();
				expect(store.circuitState()).toBe('closed');
			}
			breaker.recordFailure();
			expect(store.circuitState()).toBe('open');
			expect(store.circuitOpenedAt()).not.toBeNull();
		});

		it('half-open + failure goes back to open and resets cooldown timestamp', () => {
			const { breaker, store } = setup();
			store.setCircuitState('half-open');
			store.setConsecutiveFailures(0);
			const before = Date.now() - 1_000_000;
			store.setCircuitOpenedAt(before);

			breaker.recordFailure();

			expect(store.circuitState()).toBe('open');
			expect(store.circuitOpenedAt()!).toBeGreaterThan(before);
		});

		it('counter resets to 0 on success', () => {
			const { breaker, store } = setup();
			breaker.recordFailure();
			breaker.recordFailure();
			expect(store.consecutiveFailures()).toBe(2);

			breaker.recordSuccess();

			expect(store.consecutiveFailures()).toBe(0);
		});
	});

	describe('recordSuccess()', () => {
		it('closes the circuit when in half-open', () => {
			const { breaker, store } = setup();
			store.setCircuitState('half-open');
			store.setCircuitOpenedAt(Date.now());

			breaker.recordSuccess();

			expect(store.circuitState()).toBe('closed');
			expect(store.circuitOpenedAt()).toBeNull();
			expect(store.consecutiveFailures()).toBe(0);
		});

		it('keeps closed state on success while already closed (idempotent)', () => {
			const { breaker, store } = setup();
			breaker.recordSuccess();
			expect(store.circuitState()).toBe('closed');
		});
	});

	describe('forceProbe()', () => {
		it('transitions open → half-open ignoring cooldown', () => {
			const { breaker, store } = setup();
			store.setCircuitState('open');
			store.setCircuitOpenedAt(Date.now());

			breaker.forceProbe();

			expect(store.circuitState()).toBe('half-open');
		});

		it('is a no-op when circuit is closed', () => {
			const { breaker, store } = setup();
			breaker.forceProbe();
			expect(store.circuitState()).toBe('closed');
		});

		it('is a no-op when already half-open', () => {
			const { breaker, store } = setup();
			store.setCircuitState('half-open');
			breaker.forceProbe();
			expect(store.circuitState()).toBe('half-open');
		});
	});
});
