import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalCacheInvalidator } from './wal-cache-invalidator.service';
import { WalEntry } from './models';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { SwService } from '@features/intranet/services/sw/sw.service';

function makeEntry(overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id: 'test-id',
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		resourceId: 42,
		endpoint: '/api/horario/42',
		method: 'PUT',
		payload: {},
		status: 'COMMITTED',
		retries: 0,
		maxRetries: 2,
		...overrides,
	};
}

describe('WalCacheInvalidator', () => {
	let invalidator: WalCacheInvalidator;
	let invalidateSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		invalidateSpy = vi.fn().mockResolvedValue(1);

		TestBed.configureTestingModule({
			providers: [
				WalCacheInvalidator,
				{
					provide: SwService,
					useValue: { invalidateCacheByPattern: invalidateSpy },
				},
			],
		});

		invalidator = TestBed.inject(WalCacheInvalidator);
	});

	// #region invalidateForEntry
	describe('invalidateForEntry', () => {
		it('uses WAL_CACHE_MAP for known resourceType', async () => {
			const entry = makeEntry({ resourceType: 'horarios' });

			await invalidator.invalidateForEntry(entry);

			expect(invalidateSpy).toHaveBeenCalledWith('/api/horario');
		});

		it('uses WAL_CACHE_MAP for resourceType with multiple patterns', async () => {
			const entry = makeEntry({ resourceType: 'cursoContenido', endpoint: '/api/CursoContenido/5' });

			await invalidator.invalidateForEntry(entry);

			expect(invalidateSpy).toHaveBeenCalledWith('/api/CursoContenido');
		});

		it('falls back to endpoint extraction for unknown resourceType', async () => {
			const entry = makeEntry({
				resourceType: 'unknownResource',
				endpoint: 'https://api.example.com/api/CustomEndpoint/123',
			});

			await invalidator.invalidateForEntry(entry);

			expect(invalidateSpy).toHaveBeenCalledWith('/api/CustomEndpoint');
		});

		it('handles malformed endpoint URL gracefully', async () => {
			const entry = makeEntry({ resourceType: 'unknownResource', endpoint: '' });

			await invalidator.invalidateForEntry(entry);

			expect(invalidateSpy).not.toHaveBeenCalled();
		});

		it('handles SW invalidation failure without throwing', async () => {
			invalidateSpy.mockRejectedValue(new Error('SW unavailable'));
			const entry = makeEntry({ resourceType: 'horarios' });

			await expect(invalidator.invalidateForEntry(entry)).resolves.not.toThrow();
		});
	});
	// #endregion

	// #region invalidateForCrossTab
	describe('invalidateForCrossTab', () => {
		it('uses WAL_CACHE_MAP for known resourceType', async () => {
			await invalidator.invalidateForCrossTab('usuarios', 'entry-1');

			expect(invalidateSpy).toHaveBeenCalledWith('/api/sistema/usuarios');
		});

		it('falls back to /api/{resourceType} for unknown types', async () => {
			await invalidator.invalidateForCrossTab('customThing', 'entry-2');

			expect(invalidateSpy).toHaveBeenCalledWith('/api/customThing');
		});
	});
	// #endregion
});
