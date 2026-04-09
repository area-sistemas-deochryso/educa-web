// #region Pipes propias de @shared
export * from './full-name/full-name.pipe';
// #endregion

// #region Re-exports temporales (migrados a @intranet-shared)
// TODO(F5): Migrar consumidores a @intranet-shared y eliminar estos re-exports
/* eslint-disable no-restricted-imports */
export * from '@intranet-shared/pipes/seccion-label/seccion-label.pipe';
export * from '@intranet-shared/pipes/estado';
export * from '@intranet-shared/pipes/format-time/format-time.pipe';
export * from '@intranet-shared/pipes/format-file-size/format-file-size.pipe';
export * from '@intranet-shared/pipes/initials/initials.pipe';
/* eslint-enable no-restricted-imports */
// #endregion
