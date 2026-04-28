// #region DTOs (mirror del BE — Plan 30 Chat 4 F4.BE)

export interface EmailDiagnosticoDto {
	correoConsultado: string;
	resumen: EmailDiagnosticoResumen;
	historia: EmailDiagnosticoHistoriaItem[];
	blacklist: EmailDiagnosticoBlacklist | null;
	personasAsociadas: EmailDiagnosticoPersonaAsociada[];
	generatedAt: string;
}

export interface EmailDiagnosticoResumen {
	totalIntentos: number;
	enviados: number;
	fallidos: number;
	pendientes: number;
	primerIntento: string | null;
	ultimoIntento: string | null;
	mostrandoUltimos: number;
}

export interface EmailDiagnosticoHistoriaItem {
	id: number;
	fecha: string;
	tipo: string;
	asunto: string;
	estado: string;
	tipoFallo: string | null;
	intentos: number;
	ultimoError: string | null;
	remitente: string | null;
	bounceSource: string | null;
	bounceDetectedAt: string | null;
}

export interface EmailDiagnosticoBlacklist {
	estado: BlacklistEstado;
	motivoBloqueo: string;
	intentosFallidos: number;
	fechaPrimerFallo: string | null;
	fechaUltimoFallo: string | null;
	fechaReg: string;
	ultimoError: string | null;
}

export interface EmailDiagnosticoPersonaAsociada {
	tipoPersona: TipoPersona;
	id: number;
	dniMasked: string;
	nombreCompleto: string;
	campo: string;
}

// #endregion

// #region DTOs typeahead — Plan 36 Chat 4b BE
// * Mirror del response de GET /api/sistema/email-outbox/diagnostico/buscar-personas?q=

export interface PersonaConCorreoDto {
	tipoPersona: TipoPersona;
	id: number;
	dniMasked: string;
	nombreCompleto: string;
	campo: string;
	correo: string;
	correoMasked: string;
}

export interface BuscarPersonasResponseDto {
	query: string;
	total: number;
	personas: PersonaConCorreoDto[];
}

// #endregion

// #region Tipos semánticos

export const TIPOS_PERSONA = ['E', 'P', 'D', 'APO'] as const;
export type TipoPersona = (typeof TIPOS_PERSONA)[number];

export const BLACKLIST_ESTADOS = ['ACTIVO', 'DESPEJADO'] as const;
export type BlacklistEstado = (typeof BLACKLIST_ESTADOS)[number];

// #endregion

// #region Error codes del BE (400)

export type CorreoIndividualErrorCode = 'CORREO_REQUERIDO' | 'CORREO_INVALIDO';

// * Códigos del endpoint /diagnostico/buscar-personas (Plan 36 Chat 4b)
export type BuscarPersonasErrorCode = 'Q_REQUERIDO' | 'Q_MUY_CORTO' | 'Q_MUY_LARGO';

// #endregion
