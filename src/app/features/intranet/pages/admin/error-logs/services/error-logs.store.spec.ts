import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorLogsStore } from './error-logs.store';

describe('ErrorLogsStore', () => {
	let store: ErrorLogsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ErrorLogsStore] });
		store = TestBed.inject(ErrorLogsStore);
	});

	it('exposes filterCorrelationId starting at null', () => {
		expect(store.filterCorrelationId()).toBeNull();
		expect(store.vm().filterCorrelationId).toBeNull();
	});

	it('lets the facade write filterCorrelationId via setFilterCorrelationId', () => {
		store.setFilterCorrelationId('abc-123');
		expect(store.filterCorrelationId()).toBe('abc-123');
		expect(store.vm().filterCorrelationId).toBe('abc-123');
	});

	it('clears filterCorrelationId when set to null', () => {
		store.setFilterCorrelationId('abc-123');
		store.setFilterCorrelationId(null);
		expect(store.filterCorrelationId()).toBeNull();
	});
});
