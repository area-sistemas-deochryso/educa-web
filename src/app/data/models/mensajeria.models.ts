// #region Imports
import { AppUserRoleValue } from '@app/shared/constants';
// #endregion

// #region Response DTOs
export interface ConversacionListDto {
	id: number;
	asunto: string;
	creadorDni: string;
	creadorNombre: string;
	fechaCreacion: string;
	ultimoMensajeFecha: string | null;
	ultimoMensajePreview: string | null;
	totalParticipantes: number;
	mensajesNoLeidos: number;
	esGrupal: boolean;
}

export interface ConversacionDetalleDto {
	id: number;
	asunto: string;
	creadorDni: string;
	fechaCreacion: string;
	participantes: ParticipanteDto[];
	mensajes: MensajeDto[];
}

export interface MensajeDto {
	id: number;
	remitenteDni: string;
	remitenteNombre: string;
	contenido: string;
	fechaEnvio: string;
	esMio: boolean;
}

export interface ParticipanteDto {
	dni: string;
	nombre: string;
	rol: AppUserRoleValue;
	ultimaLectura: string | null;
}
// #endregion

// #region Request DTOs
export interface CrearConversacionDto {
	asunto: string;
	destinatariosDni: string[];
	mensajeInicial: string;
	horarioId?: number;
}

export interface EnviarMensajeDto {
	conversacionId: number;
	contenido: string;
}
// #endregion

// #region Response payloads
export interface CrearConversacionResponseDto {
	conversacionId: number;
}

export interface EnviarMensajeResponseDto {
	mensajeId: number;
}
// #endregion

// #region Destinatarios
export interface DestinatarioDto {
	dni: string;
	nombre: string;
	detalle: string | null;
}

export interface DestinatariosDisponiblesDto {
	profesores: DestinatarioDto[];
	estudiantes: DestinatarioDto[];
	companeros: DestinatarioDto[];
	puedeEnviarATodos: boolean;
}
// #endregion
