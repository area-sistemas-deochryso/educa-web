// #region Implementation

export interface NotificacionLista {
	id: number;
	titulo: string;
	mensaje: string;
	tipo: string;
	prioridad: string;
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
	tipo: string;
	prioridad: string;
	icono: string;
	actionUrl: string | null;
	actionText: string | null;
	dismissible: boolean;
}

export interface CrearNotificacionRequest {
	titulo: string;
	mensaje: string;
	tipo: string;
	prioridad: string;
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
	tipo: string;
	prioridad: string;
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
