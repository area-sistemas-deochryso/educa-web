// #region Public API
// * Storage service exports — facade, smart-data store, and models are public.
// * Internal services (SessionStorage, Preferences, IndexedDB, CacheStorage, NotificationStorage)
//   are implementation details — use StorageService instead.
// * SmartDataStorageService is exposed because notifications smart-prefetch needs its keyed
//   cache (out of scope for the generic StorageService facade).
export { StorageService } from './storage.service';
export type { CorrelationViewMode, ErrorGroupsViewMode } from './storage.service';
export { SmartDataStorageService } from './smart-data-storage.service';
export * from './storage.models';
// #endregion
