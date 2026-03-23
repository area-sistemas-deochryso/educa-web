// #region ViewModel Base
/** Propiedades que todo ViewModel de un módulo CRUD tiene */
export interface BaseVm {
	loading: boolean;
	error: string | null;
}

/** ViewModel extendido para módulos CRUD con tabla + dialog */
export interface CrudVm<T> extends BaseVm {
	items: T[];
	isEmpty: boolean;
	dialogVisible: boolean;
	confirmDialogVisible: boolean;
	isEditing: boolean;
}
// #endregion
