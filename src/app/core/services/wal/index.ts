// #region Public API
// * WAL exports — facade, status facade/store, clock, cross-tab refetch, models, error utils.
// * Internal services (WalService, SyncEngine, Db, Leader, Metrics, CacheInvalidator,
//   Coalescer, Reconciler, CircuitBreaker, SyncRecovery) are implementation details —
//   consume via WalFacadeHelper.
export * from './models';
export { WalClockService } from './wal-clock.service';
export { WalStatusStore, type WalBannerMessage } from './wal-status.store';
export { WalStatusFacade } from './wal-status.facade';
export { WalFacadeHelper } from './wal-facade-helper.service';
export { WalCrossTabRefetchService } from './wal-cross-tab-refetch.service';
export { isConflictError, isPermanentError } from './wal-error.utils';
// #endregion
