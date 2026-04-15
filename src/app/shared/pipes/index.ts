// #region Pipes propias de @shared
export * from './full-name/full-name.pipe';
// #endregion

// #region Re-exports temporales (migrados a @intranet-shared)
// TODO(F5): Migrar consumidores a @intranet-shared y eliminar estos re-exports
/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal de migración @shared → @intranet-shared; eliminar cuando los consumidores usen el alias final (Plan 1 F5.3). */
export * from '@intranet-shared/pipes/seccion-label/seccion-label.pipe';
export * from '@intranet-shared/pipes/estado';
export * from '@intranet-shared/pipes/format-time/format-time.pipe';
export * from '@intranet-shared/pipes/format-file-size/format-file-size.pipe';
export * from '@intranet-shared/pipes/initials/initials.pipe';
/* eslint-enable layer-enforcement/imports-error */
// #endregion
