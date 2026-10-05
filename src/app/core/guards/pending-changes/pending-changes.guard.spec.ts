import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import type { HasPendingChanges } from './has-pending-changes';
import { pendingChangesGuard } from './pending-changes.guard';

describe('pendingChangesGuard', () => {
	const run = (component: HasPendingChanges) =>
		TestBed.runInInjectionContext(() =>
			pendingChangesGuard(
				component,
				{} as ActivatedRouteSnapshot,
				{} as RouterStateSnapshot,
				{} as RouterStateSnapshot,
			),
		);

	it('lets the user leave without asking when nothing is pending', () => {
		const confirmLeave = vi.fn();

		expect(run({ hasPendingChanges: () => false, confirmLeave })).toBe(true);
		expect(confirmLeave).not.toHaveBeenCalled();
	});

	it('delegates to the component prompt when there are pending changes', async () => {
		const confirmLeave = vi.fn().mockResolvedValue(false);

		const result = run({ hasPendingChanges: () => true, confirmLeave });

		expect(confirmLeave).toHaveBeenCalledOnce();
		await expect(result).resolves.toBe(false);
	});

	it('allows leaving when the component prompt resolves true', async () => {
		const result = run({ hasPendingChanges: () => true, confirmLeave: () => Promise.resolve(true) });

		await expect(result).resolves.toBe(true);
	});
});
