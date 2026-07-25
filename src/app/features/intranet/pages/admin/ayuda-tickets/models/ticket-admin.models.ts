// #region Ticket admin (xrepo-panel-ayuda-intranet F7b)
// Ver `educa-coord/contracts/api-catalog.md` § Ayuda > Ticket y
// `Educa.API/DTOs/Ayuda/{TicketAdminDto,TicketTipoAdminDto,...}.cs` para el shape exacto.
// Reusa `TicketEstado` de la sección pública (F5) — mismo enum de estado, sin duplicar.

import { TicketEstado } from '@features/intranet/pages/cross-role/ayuda/models/ticket.models';

export type { TicketEstado };

/** Ticket en la bandeja administrativa — incluye el usuario emisor y el `RowVersion`. */
export interface TicketAdminDto {
	id: number;
	tipoNombre: string;
	descripcion: string;
	propuesta: string | null;
	estado: TicketEstado;
	usuarioNombre: string;
	fechaReg: string;
	fechaMod: string | null;
	rowVersion: string;
}

export interface ActualizarEstadoTicketDto {
	estado: TicketEstado;
	rowVersion: string;
}

/** Tipo de problema para el panel de administración — incluye estado y `RowVersion`. */
export interface TicketTipoAdminDto {
	id: number;
	nombre: string;
	estado: boolean;
	rowVersion: string;
}

export interface CrearTicketTipoDto {
	nombre: string;
}

export interface ActualizarTicketTipoDto {
	nombre: string;
	rowVersion: string;
}

export interface CambiarEstadoTicketTipoDto {
	estado: boolean;
	rowVersion: string;
}
// #endregion
