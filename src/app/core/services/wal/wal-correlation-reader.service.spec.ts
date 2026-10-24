// * Tests for WalCorrelationReader — read-only window used by the correlation hub (Plan 41 F6).
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalCorrelationReader } from './wal-correlation-reader.service';
import { WalDbService } from './wal-db.service';

describe('WalCorrelationReader', () => {
	let getByCorrelationId: ReturnType<typeof vi.fn>;
	let reader: WalCorrelationReader;

	beforeEach(() => {
		getByCorrelationId = vi.fn().mockResolvedValue([]);
		TestBed.configureTestingModule({
			providers: [WalCorrelationReader, { provide: WalDbService, useValue: { getByCorrelationId } }],
		});
		reader = TestBed.inject(WalCorrelationReader);
	});

	it('delegates the lookup to WalDbService.getByCorrelationId', async () => {
		const entries = [{ id: 'a' }];
		getByCorrelationId.mockResolvedValue(entries);

		expect(await reader.getByCorrelationId('sess-1')).toBe(entries);
		expect(getByCorrelationId).toHaveBeenCalledWith('sess-1');
	});
});
