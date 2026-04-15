import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { logger } from '@core/helpers';
import { ActivityTrackerService } from '@core/services/error/activity-tracker.service';
import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalService } from './wal.service';
import { WalSyncEngine } from './wal-sync-engine.service';
import { WalStatusFacade } from './wal-status.facade';
import { WalMutationConfig } from './models';

/**
 * Facade integration point for WAL protected mutations.
 */
@Injectable({ providedIn: 'root' })
export class WalFacadeHelper {
	// #region Dependencies

	private wal = inject(WalService);
	private syncEngine = inject(WalSyncEngine);
	private statusFacade = inject(WalStatusFacade);
	private sw = inject(SwService);
	private errorHandler = inject(ErrorHandlerService);
	private activityTracker = inject(ActivityTrackerService);

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
		// Track WAL operation for error breadcrumbs
		this.activityTracker.track('WAL_OPERATION',
			`WAL: ${config.operation} ${config.resourceType}${config.resourceId ? ` #${config.resourceId}` : ''}`,
		);

		const consistency = config.consistencyLevel ?? 'optimistic';

		// server-confirmed and serialized: skip optimistic, execute directly and wait
		if (consistency === 'server-confirmed' || consistency === 'serialized') {
			this.executeServerConfirmed(config);
			return;
		}

		// optimistic / optimistic-confirm: standard WAL flow
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
				consistencyLevel: consistency,
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
					this.statusFacade.refresh();
				});
			} else {
				// Offline: notify user, entry stays PENDING in IndexedDB
				this.errorHandler.showInfo(
					'Sin conexion',
					'La operacion se guardara cuando vuelva la conexion',
				);
				this.statusFacade.refresh();
			}
		} catch (e) {
			// WAL append failed (IndexedDB unavailable or quota exceeded)
			// Fall back to direct execution without WAL protection
			const isQuota = e instanceof DOMException && e.name === 'QuotaExceededError';
			logger.error('[WAL-Helper] WAL append failed, executing directly', isQuota ? '(QuotaExceeded)' : '', e);

			if (isQuota) {
				this.errorHandler.showWarning(
					'Almacenamiento lleno',
					'No se pudo guardar offline. La operación se enviará directamente al servidor.',
				);
			}

			this.executeFallback(config);
		}
	}

	// #endregion

	// #endregion

	// #region Post-reload Reconciliation

	/**
	 * Observable that emits when a WAL entry for `resourceType` was committed
	 * after a page reload (no onCommit callback available).
	 * Facades should subscribe to this to trigger a refetch of their data.
	 *
	 * @example
	 * this.walHelper.postReloadCommit$('horarios')
	 *   .pipe(takeUntilDestroyed(this.destroyRef))
	 *   .subscribe(() => this.loadData());
	 */
	postReloadCommit$(resourceType: string): Observable<string> {
		return this.syncEngine.entryProcessed$.pipe(
			filter(
				(r) =>
					r.status === 'COMMITTED' &&
					r.resourceType === resourceType &&
					r.hadCallback === false,
			),
			map((r) => r.entryId),
		);
	}

	// #endregion

	// #region Server-Confirmed Execution

	/**
	 * Execute mutation directly without optimistic UI.
	 * Waits for server confirmation before calling onCommit.
	 * Used for 'server-confirmed' and 'serialized' consistency levels.
	 * Does NOT use WAL — if offline, shows error immediately.
	 */
	private executeServerConfirmed<T>(config: WalMutationConfig<T>): void {
		if (!this.sw.isOnline) {
			this.errorHandler.showWarning(
				'Sin conexion',
				'Esta operacion requiere confirmacion del servidor. Intente cuando tenga conexion.',
			);
			return;
		}

		config.http$().subscribe({
			next: (result) => config.onCommit(result),
			error: (err) => config.onError(err),
		});
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
