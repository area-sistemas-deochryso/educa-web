// #region Ticket (xrepo-panel-ayuda-intranet F2/F5)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda > Ticket y `Educa.API`
// `CrearTicketDto`/`TicketDto`/`TicketTipoDto`/`TicketEstados`.

export const TICKET_DESCRIPCION_MIN = 20;
export const TICKET_DESCRIPCION_MAX = 2000;
export const TICKET_PROPUESTA_MAX = 2000;

/** Estados válidos de un ticket — mismos valores que `TicketEstados` en el BE. */
export type TicketEstado = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO';

export interface TicketTipoDto {
	id: number;
	nombre: string;
}

/** Ticket propio del usuario autenticado — su historial/estado. */
export interface TicketDto {
	id: number;
	tipoNombre: string;
	descripcion: string;
	propuesta: string | null;
	estado: TicketEstado;
	fechaReg: string;
	fechaMod: string | null;
}

export interface CrearTicketDto {
	tipoId: number;
	descripcion: string;
	propuesta?: string | null;
}
// #endregion
