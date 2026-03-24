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

/**
 * Convierte cualquier objeto a SelectOption usando keys arbitrarias.
 * Útil cuando el backend no sigue el patrón { id, nombre }.
 *
 * @example
 * // { salonDescripcion: 'Aula 1', salonId: 5 } → { label: 'Aula 1', value: 5 }
 * toSelectOptionFrom(salon, 'salonDescripcion', 'salonId')
 */
export function toSelectOptionFrom<T, K extends keyof T>(
	item: T,
	labelKey: keyof T,
	valueKey: K,
): SelectOption<T[K]> {
	return { label: String(item[labelKey]), value: item[valueKey] };
}

/** Convierte un array de objetos a SelectOption[] usando keys arbitrarias */
export function toSelectOptionsFrom<T, K extends keyof T>(
	items: T[],
	labelKey: keyof T,
	valueKey: K,
): SelectOption<T[K]>[] {
	return items.map((item) => toSelectOptionFrom(item, labelKey, valueKey));
}

/**
 * Prepende una opción "Todos" (o label custom) al inicio de un array de opciones.
 * El value de la opción "Todos" es null.
 *
 * @example
 * withAllOption(rolesOptions) → [{ label: 'Todos', value: null }, ...rolesOptions]
 * withAllOption(modulosOptions, 'Todos los módulos') → [{ label: 'Todos los módulos', value: null }, ...options]
 */
export function withAllOption<T>(
	options: SelectOption<T>[],
	label = 'Todos',
): SelectOption<T | null>[] {
	return [{ label, value: null }, ...options];
}
// #endregion
