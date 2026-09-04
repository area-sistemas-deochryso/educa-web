export interface CreacionMasivaErrorDto {
	fila: number;
	detalle: string;
	razon: string;
}

/**
 * Mismo shape para cualquier entidad (Salones, Cursos, y Usuarios cuando 625 cierre) —
 * el backend lo comparte deliberadamente (P107 F3) para que sumar una entidad nueva
 * reutilice el contrato sin duplicarlo.
 */
export interface CreacionMasivaResponseDto {
	creados: number;
	rechazados: number;
	errores: CreacionMasivaErrorDto[];
}

export interface CrearSalonDto {
	gradoId: number;
	seccionId: number;
	sedeId: number;
	anio: number;
}

export interface CrearCursoDto {
	nombre: string;
	gradosIds: number[];
}

export interface CrearUsuarioDto {
	dni: string;
	nombres: string;
	apellidos: string;
	contrasena: string;
	rol: string;
	sedeId?: number;
	telefono?: string;
	correo?: string;
}

/**
 * Resultado de borrado masivo de datos de prueba (P107 F4) — mismo shape que
 * CreacionMasivaResponseDto para errores por fila (acá, id del registro).
 */
export interface BorradoMasivoResponseDto {
	eliminados: number;
	rechazados: number;
	errores: CreacionMasivaErrorDto[];
}
