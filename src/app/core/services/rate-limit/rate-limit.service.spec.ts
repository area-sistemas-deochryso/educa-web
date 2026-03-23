// * Tests for RateLimitService — validates cooldown state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RateLimitService } from './rate-limit.service';

// #endregion

// #region Tests
describe('RateLimitService', () => {
	let service: RateLimitService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [RateLimitService] });
		service = TestBed.inject(RateLimitService);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should not be cooling down', () => {
			expect(service.remainingSeconds()).toBe(0);
			expect(service.isCoolingDown()).toBe(false);
		});
	});
	// #endregion

	// #region activateCooldown
	describe('activateCooldown', () => {
		it('should activate cooldown', () => {
			service.activateCooldown(10);

			expect(service.remainingSeconds()).toBe(10);
			expect(service.isCoolingDown()).toBe(true);
		});

		it('should enforce minimum of 5 seconds', () => {
			service.activateCooldown(2);

			expect(service.remainingSeconds()).toBe(5);
		});

		it('should not shorten existing longer cooldown', () => {
			service.activateCooldown(30);
			service.activateCooldown(10);

			expect(service.remainingSeconds()).toBe(30);
		});

		it('should extend cooldown if new duration is longer', () => {
			service.activateCooldown(10);
			service.activateCooldown(30);

			expect(service.remainingSeconds()).toBe(30);
		});
	});
	// #endregion
});
// #endregion
