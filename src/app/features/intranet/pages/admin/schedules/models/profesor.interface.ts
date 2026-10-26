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
	/** Solo candidatos de horario en modo por curso (INV-AS02). null/ausente = no aplica. */
	habilitadoParaCurso?: boolean | null;
}

/**
 * Interfaz para opciones de dropdown de profesores
 */
export interface ProfesorOption {
	label: string;
	value: number;
	dni?: string;
	/** true = el profesor aún no está habilitado para el curso del horario: asignarlo lo habilita. */
	requiereHabilitacion?: boolean;
}

/**
 * Interfaz para información básica del profesor
 */
export interface ProfesorInfo {
	id: number;
	nombre: string;
	dni: string;
}
// #endregion
