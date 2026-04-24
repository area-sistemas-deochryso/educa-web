// #region DTOs (mirror del BE — Plan 30 Chat 3 F3.BE)

export interface DiagnosticoCorreosDiaDto {
	fecha: string;
	sedeId: number | null;
	resumen: DiagnosticoCorreosDiaResumen;
	estudiantesSinCorreo: EstudianteSinCorreoApoderado[];
	apoderadosBlacklisteados: ApoderadoBlacklisteadoDelDia[];
	entradasSinCorreoEnviado: EntradaSinCorreoEnviado[];
	generatedAt: string;
}

export interface DiagnosticoCorreosDiaResumen {
	entradasMarcadas: number;
	estudiantesConEntrada: number;
	estudiantesFueraDeAlcance: number;
	estudiantesSinCorreoApoderado: number;
	correosApoderadosBlacklisteados: number;
	correosEnviados: number;
	correosFallidos: number;
	correosPendientes: number;
	correosFaltantes: number;
}

export interface EstudianteSinCorreoApoderado {
	estudianteId: number;
	dniMasked: string;
	nombreCompleto: string;
	salon: string;
	graOrden: number;
}

export interface ApoderadoBlacklisteadoDelDia {
	correoMasked: string;
	motivoBloqueo: string;
	fechaBloqueo: string;
	hijosAfectadosConEntradaHoy: number;
}

export interface EntradaSinCorreoEnviado {
	asistenciaId: number;
	estudianteId: number;
	dniMasked: string;
	nombreCompleto: string;
	salon: string;
	graOrden: number;
	horaEntrada: string;
	razon: DiagnosticoRazon;
	tipoFallo: string | null;
}

// #endregion

// #region Tipo semántico: razón del gap

export const DIAGNOSTICO_RAZONES = [
	'SIN_CORREO',
	'BLACKLISTED',
	'FALLIDO',
	'PENDIENTE',
	'SIN_RASTRO',
] as const;
export type DiagnosticoRazon = (typeof DIAGNOSTICO_RAZONES)[number];

// #endregion

// #region Error codes del BE (400)

export type CorreosDiaErrorCode =
	| 'FECHA_FORMATO_INVALIDO'
	| 'FECHA_FUTURA_INVALIDA'
	| 'FECHA_DEMASIADO_ANTIGUA'
	| 'SEDE_ID_INVALIDO';

// #endregion
