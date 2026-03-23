import { Signal } from '@angular/core';

import { HasId } from './entity.interfaces';

// #region Store Contracts

/** Contrato de lectura para un store CRUD */
export interface CrudStoreReadonly<T extends HasId, TStats = unknown> {
	readonly items: Signal<T[]>;
	readonly loading: Signal<boolean>;
	readonly error: Signal<string | null>;

	readonly dialogVisible: Signal<boolean>;
	readonly confirmDialogVisible: Signal<boolean>;
	readonly selectedItem: Signal<T | null>;
	readonly isEditing: Signal<boolean>;

	readonly estadisticas: Signal<TStats | null>;
}

/** Contrato de escritura para un store CRUD */
export interface CrudStoreCommands<T extends HasId, TForm = Partial<T>> {
	setItems(items: T[]): void;
	addItem(item: T): void;
	updateItem(id: number, updates: Partial<T>): void;
	removeItem(id: number): void;

	setLoading(loading: boolean): void;
	setError(error: string | null): void;
	clearError(): void;

	openDialog(): void;
	closeDialog(): void;
	openConfirmDialog(): void;
	closeConfirmDialog(): void;

	setSelectedItem(item: T | null): void;
	setFormData(data: TForm): void;
	setIsEditing(editing: boolean): void;
}
// #endregion
