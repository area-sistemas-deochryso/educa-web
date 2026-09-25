// #region Core generic UI messages
// Subset genérico consumido por infra de @core (ej. BaseCrudFacade). Mensajes
// específicos de feature siguen viviendo en @shared/constants — no fusionar.
export const CORE_UI_MESSAGES = {
	error: 'Error',
	refreshDataError: 'No se pudieron actualizar los datos',
} as const;
// #endregion
