// #region Implementation

export interface EventoCalendarioLista {
	id: number;
	titulo: string;
	descripcion: string;
	tipo: string;
	icono: string;
	fechaInicio: string;
	fechaFin: string | null;
	hora: string | null;
	ubicacion: string | null;
	estado: boolean;
	anio: number;
	fechaCreacion: string;
	fechaModificacion: string | null;
	rowVersion: string;
}

export interface EventoCalendarioActivo {
	id: number;
	titulo: string;
	descripcion: string;
	tipo: string;
	icono: string;
	fechaInicio: string;
	fechaFin: string | null;
	hora: string | null;
	ubicacion: string | null;
}

export interface CrearEventoCalendarioRequest {
	titulo: string;
	descripcion: string;
	tipo: string;
	icono: string;
	fechaInicio: string;
	fechaFin?: string;
	hora?: string;
	ubicacion?: string;
	estado: boolean;
	anio: number;
}

export interface ActualizarEventoCalendarioRequest {
	titulo: string;
	descripcion: string;
	tipo: string;
	icono: string;
	fechaInicio: string;
	fechaFin?: string;
	hora?: string;
	ubicacion?: string;
	estado: boolean;
	anio: number;
	rowVersion: string;
}

export interface EventosCalendarioEstadisticas {
	total: number;
	activos: number;
	inactivos: number;
	proximosMes: number;
}

export interface EventoCalendarioApiResponse {
	mensaje: string;
}

// #endregion
