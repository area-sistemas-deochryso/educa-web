// #region Select Options
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

/** Convierte { id, nombre } del backend a SelectOption<number> para PrimeNG */
export function toSelectOption(item: IdNameOption): SelectOption<number> {
	return { label: item.nombre, value: item.id };
}

/** Convierte un array de { id, nombre } a SelectOption<number>[] */
export function toSelectOptions(items: IdNameOption[]): SelectOption<number>[] {
	return items.map(toSelectOption);
}
// #endregion
