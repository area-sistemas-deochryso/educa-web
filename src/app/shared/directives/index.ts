// #region Re-exports temporales (migrados a @intranet-shared)
// TODO(F5): Migrar consumidores a @intranet-shared y eliminar estos re-exports
/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal de migración @shared → @intranet-shared; eliminar cuando los consumidores usen el alias final (Plan 1 F5.3). */
export * from '@intranet-shared/directives/uppercase-input/uppercase-input.directive';
export * from '@intranet-shared/directives/table-loading/table-loading.directive';
export * from '@intranet-shared/directives/drag-drop';
/* eslint-enable layer-enforcement/imports-error */
// #endregion
