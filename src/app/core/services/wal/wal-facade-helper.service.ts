import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalService } from './wal.service';
import { WalSyncEngine } from './wal-sync-engine.service';
import { WalStatusStore } from './wal-status.store';
import { WalMutationConfig } from './models';

/**
 * Facade integration point for WAL protected mutations.
 */
@Injectable({ providedIn: 'root' })
export class WalFacadeHelper {
	// #region Dependencies

	private wal = inject(WalService);
	private syncEngine = inject(WalSyncEngine);
	private statusStore = inject(WalStatusStore);
	private sw = inject(SwService);
	private errorHandler = inject(ErrorHandlerService);

	// #endregion

	// #region Execute

	/**
	 * Execute a WAL protected mutation.
	 *
	 * @param config Mutation configuration.
	 *
	 * @example
	 * wal.execute({
	 *   operation: 'CREATE',
	 *   resourceType: 'CursoContenido',
	 *   endpoint: '/api/CursoContenido',
	 *   method: 'POST',
	 *   payload: request,
	 *   http$: () => this.api.crearContenido(request),
	 *   onCommit: () => {},
	 *   onError: () => {},
	 * });
	 */
	async execute<T>(config: WalMutationConfig<T>): Promise<void> {
		// Step 1: Optimistic UI update (immediate)
		if (config.optimistic) {
			config.optimistic.apply();
		}

		try {
			// Step 2: Persist to WAL (IndexedDB)
			const entry = await this.wal.append({
				operation: config.operation,
				resourceType: config.resourceType,
				resourceId: config.resourceId,
				endpoint: config.endpoint,
				method: config.method,
				payload: config.payload,
				maxRetries: config.maxRetries,
			});

			// Step 3: Register callbacks for this session
			this.syncEngine.registerCallbacks(entry.id, {
				http$: config.http$,
				onCommit: config.onCommit as (result: unknown) => void,
				onError: config.onError,
				rollback: config.optimistic?.rollback,
			});

			// Step 4: Send or queue
			if (this.sw.isOnline) {
				// Online: serialize via processAllPending (drain loop picks up new entries)
				// Prevents concurrent requests to the same DB row on rapid clicks
				this.syncEngine.processAllPending().finally(() => {
					this.statusStore.refresh();
				});
			} else {
				// Offline: notify user, entry stays PENDING in IndexedDB
				this.errorHandler.showInfo(
					'Sin conexion',
					'La operacion se guardara cuando vuelva la conexion',
				);
				this.statusStore.refresh();
			}
		} catch (e) {
			// WAL append failed (IndexedDB unavailable?)
			// Fall back to direct execution without WAL
			logger.error('[WAL-Helper] Failed to append to WAL, executing directly', e);
			this.executeFallback(config);
		}
	}

	// #endregion

	// #region Fallback

	/**
	 * Execute mutation directly without WAL protection.
	 * Used when IndexedDB is unavailable.
	 *
	 * @param config Mutation configuration.
	 */
	private executeFallback<T>(config: WalMutationConfig<T>): void {
		config.http$().subscribe({
			next: (result) => config.onCommit(result),
			error: (err) => {
				config.optimistic?.rollback();
				config.onError(err);
			},
		});
	}

	// #endregion
}
