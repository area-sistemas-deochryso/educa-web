// #region Public API
// * WAL exports — only facade, status store, clock, and error utils are public.
// * Internal services (Db, SyncEngine, Leader, Metrics, CacheInvalidator, Coalescer) are implementation details.
export * from './models';
export { WalService } from './wal.service';
export { WalClockService } from './wal-clock.service';
export { WalStatusStore } from './wal-status.store';
export { WalStatusFacade } from './wal-status.facade';
export { WalFacadeHelper } from './wal-facade-helper.service';
export { isConflictError, isPermanentError } from './wal-error.utils';
// #endregion
