// #region Implementation
export * from './toast-container';
export * from './skeleton-loader';
export * from './devtools';
export * from './correlation-id-pill';
// #endregion

// #region Re-exports temporales (migrados a @intranet-shared)
// TODO(F5): Migrar consumidores a @intranet-shared y eliminar estos re-exports
/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal de migración @shared → @intranet-shared; eliminar cuando los consumidores usen el alias final (Plan 1 F5.3). */
export * from '@intranet-shared/components/form-error';
export * from '@intranet-shared/components/form-field-error';
export * from '@intranet-shared/components/sync-status';
export * from '@intranet-shared/components/page-header';
export * from '@intranet-shared/components/responsive-table';
export * from '@intranet-shared/components/table-skeleton';
export * from '@intranet-shared/components/stats-skeleton';
/* eslint-enable layer-enforcement/imports-error */
// #endregion
