// #region Response DTOs
export interface GrupoContenidoDto {
	id: number;
	cursoContenidoId: number;
	nombre: string;
	orden: number;
	estado: boolean;
	estudiantes: GrupoEstudianteDto[];
}

export interface GrupoEstudianteDto {
	id: number;
	estudianteId: number;
	estudianteNombre: string;
	estudianteDni: string;
}

export interface GruposResumenDto {
	cursoContenidoId: number;
	maxEstudiantesPorGrupo: number | null;
	grupos: GrupoContenidoDto[];
	estudiantesSinGrupo: EstudianteSinGrupoDto[];
}

export interface EstudianteSinGrupoDto {
	estudianteId: number;
	estudianteNombre: string;
	estudianteDni: string;
}
// #endregion

// #region Request DTOs
export interface CrearGrupoDto {
	cursoContenidoId: number;
	nombre: string;
}

export interface ActualizarGrupoDto {
	nombre: string;
}

export interface AsignarEstudiantesGrupoDto {
	estudianteIds: number[];
}

export interface ConfigurarMaxEstudiantesDto {
	maxEstudiantesPorGrupo: number | null;
}

export interface OverrideMiembroDto {
	estudianteId: number;
	nota: number;
	observacion: string | null;
}

export interface CalificarGrupoDto {
	grupoId: number;
	nota: number;
	observacion: string | null;
	overrides?: OverrideMiembroDto[];
}

export interface CalificarGruposLoteDto {
	grupos: CalificarGrupoDto[];
}
// #endregion
