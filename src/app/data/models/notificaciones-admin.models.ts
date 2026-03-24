// #region Tipos semánticos

export const NOTIFICACION_TIPOS = ['matricula', 'pago', 'academico', 'festividad', 'evento'] as const;
export type NotificacionTipo = (typeof NOTIFICACION_TIPOS)[number];

export const NOTIFICACION_PRIORIDADES = ['low', 'medium', 'high', 'urgent'] as const;
export type NotificacionPrioridad = (typeof NOTIFICACION_PRIORIDADES)[number];

// #endregion

// #region DTOs

export interface NotificacionLista {
	id: number;
	titulo: string;
	mensaje: string;
	tipo: NotificacionTipo;
	prioridad: NotificacionPrioridad;
	icono: string;
	fechaInicio: string;
	fechaFin: string;
	actionUrl: string | null;
	actionText: string | null;
	dismissible: boolean;
	estado: boolean;
	anio: number;
	fechaCreacion: string;
	fechaModificacion: string | null;
	rowVersion: string;
}

export interface NotificacionActiva {
	id: number;
	titulo: string;
	mensaje: string;
	tipo: NotificacionTipo;
	prioridad: NotificacionPrioridad;
	icono: string;
	actionUrl: string | null;
	actionText: string | null;
	dismissible: boolean;
}

export interface CrearNotificacionRequest {
	titulo: string;
	mensaje: string;
	tipo: NotificacionTipo;
	prioridad: NotificacionPrioridad;
	icono: string;
	fechaInicio: string;
	fechaFin: string;
	actionUrl?: string;
	actionText?: string;
	dismissible: boolean;
	estado: boolean;
	anio: number;
}

export interface ActualizarNotificacionRequest {
	titulo: string;
	mensaje: string;
	tipo: NotificacionTipo;
	prioridad: NotificacionPrioridad;
	icono: string;
	fechaInicio: string;
	fechaFin: string;
	actionUrl?: string;
	actionText?: string;
	dismissible: boolean;
	estado: boolean;
	anio: number;
	rowVersion: string;
}

export interface NotificacionesEstadisticas {
	total: number;
	activas: number;
	inactivas: number;
	vigentesHoy: number;
}

export interface ApiResponse {
	mensaje: string;
}

// #endregion
