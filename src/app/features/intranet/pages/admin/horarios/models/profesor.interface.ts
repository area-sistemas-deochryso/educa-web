// #region Implementation
/**
 * DTO para lista de profesores (similar a SalonListDto)
 */
export interface ProfesorListDto {
	id: number;
	nombre: string;
	apellidos: string;
	dni: string;
	estado: boolean;
}

/**
 * Interfaz para opciones de dropdown de profesores
 */
export interface ProfesorOption {
	label: string;
	value: number;
	dni?: string;
}

/**
 * Interfaz para informaciÃ³n bÃ¡sica del profesor
 */
export interface ProfesorInfo {
	id: number;
	nombre: string;
	dni: string;
}
// #endregion
