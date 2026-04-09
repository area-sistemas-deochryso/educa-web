// #region Implementation
export * from './toast-container';
export * from './skeleton-loader';
export * from './rate-limit-banner';
export * from './devtools';
// #endregion

// #region Re-exports temporales (migrados a @intranet-shared)
// TODO(F5): Migrar consumidores a @intranet-shared y eliminar estos re-exports
/* eslint-disable no-restricted-imports */
export * from '@intranet-shared/components/form-error';
export * from '@intranet-shared/components/form-field-error';
export * from '@intranet-shared/components/sync-status';
export * from '@intranet-shared/components/page-header';
export * from '@intranet-shared/components/responsive-table';
export * from '@intranet-shared/components/table-skeleton';
export * from '@intranet-shared/components/stats-skeleton';
/* eslint-enable no-restricted-imports */
// #endregion
