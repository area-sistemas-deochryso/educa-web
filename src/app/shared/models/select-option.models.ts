// #region Types

/**
 * Opción genérica para p-select, p-multiselect, y cualquier dropdown.
 * Reemplaza todas las variantes { label, value } dispersas en el codebase.
 */
export interface SelectOption<T = string> {
	label: string;
	value: T;
	disabled?: boolean;
}

export interface GroupedSelectOption<T = string> {
	label: string;
	items: SelectOption<T>[];
}

/**
 * Para entidades que vienen del backend con { id, nombre }.
 * No usar como SelectOption directamente — convertir con toSelectOption().
 */
export interface IdNameOption {
	id: number;
	nombre: string;
}

// #endregion

// Re-export utils para compatibilidad con imports existentes
export {
	toSelectOption,
	toSelectOptions,
	toSelectOptionFrom,
	toSelectOptionsFrom,
	withAllOption,
} from '@shared/utils/select-option.utils';
