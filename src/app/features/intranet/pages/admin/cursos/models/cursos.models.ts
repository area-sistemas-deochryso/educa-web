// #region Implementation
// * Curso DTOs and request shapes.
export interface Grado {
	id: number;
	nombre: string;
}

/** Config per education level for data-driven rendering of grados sections */
export interface NivelGradoConfig {
	key: string;
	title: string;
	icon: string;
	tagClass: string;
	severity: 'info' | 'success' | 'warn';
	allGrados: Grado[];
	selectedGrados: Grado[];
	availableGrados: Grado[];
}

export interface Curso {
	id: number;
	nombre: string;
	estado: boolean;
	usuarioReg?: string;
	fechaReg?: Date;
	usuarioMod?: string;
	fechaMod?: Date;
	grados: Grado[];
	rowVersion?: string;
}

export interface CrearCursoRequest {
	nombre: string;
	gradosIds: number[];
}

export interface ActualizarCursoRequest {
	nombre: string;
	estado: boolean;
	gradosIds: number[];
	rowVersion?: string;
}

export interface CursosEstadisticas {
	totalCursos: number;
	cursosActivos: number;
	cursosInactivos: number;
}
// #endregion
