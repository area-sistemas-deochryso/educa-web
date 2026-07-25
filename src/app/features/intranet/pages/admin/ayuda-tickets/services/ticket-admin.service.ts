import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import {
	ActualizarEstadoTicketDto,
	ActualizarTicketTipoDto,
	CambiarEstadoTicketTipoDto,
	CrearTicketTipoDto,
	TicketAdminDto,
	TicketEstado,
	TicketTipoAdminDto,
} from '../models/ticket-admin.models';

/**
 * Gateway de los endpoints admin de Ticket del panel de ayuda (bandeja + catálogo de
 * tipos), protegidos por `AYUDA_TICKET_MANAGE` (ver `api-catalog.md` § Ayuda > Ticket).
 * Domino distinto del `TicketService` público de F5 (ese consume `/api/tickets/*`,
 * este `/api/admin/tickets*` y `/api/admin/ticket-tipos*`).
 */
@Injectable({ providedIn: 'root' })
export class TicketAdminService {
	private readonly http = inject(HttpClient);
	private readonly bandejaUrl = `${environment.apiUrl}/api/admin/tickets`;
	private readonly tiposUrl = `${environment.apiUrl}/api/admin/ticket-tipos`;

	// #region Bandeja
	getBandeja(estado?: TicketEstado): Observable<TicketAdminDto[]> {
		const params = estado ? { estado } : undefined;
		return this.http.get<TicketAdminDto[]>(this.bandejaUrl, { params });
	}

	actualizarEstado(id: number, dto: ActualizarEstadoTicketDto): Observable<TicketAdminDto> {
		return this.http.patch<TicketAdminDto>(`${this.bandejaUrl}/${id}/estado`, dto);
	}
	// #endregion

	// #region Catálogo de tipos
	getTipos(): Observable<TicketTipoAdminDto[]> {
		return this.http.get<TicketTipoAdminDto[]>(this.tiposUrl);
	}

	crearTipo(dto: CrearTicketTipoDto): Observable<TicketTipoAdminDto> {
		return this.http.post<TicketTipoAdminDto>(this.tiposUrl, dto);
	}

	actualizarTipo(id: number, dto: ActualizarTicketTipoDto): Observable<TicketTipoAdminDto> {
		return this.http.put<TicketTipoAdminDto>(`${this.tiposUrl}/${id}`, dto);
	}

	cambiarEstadoTipo(id: number, dto: CambiarEstadoTicketTipoDto): Observable<TicketTipoAdminDto> {
		return this.http.patch<TicketTipoAdminDto>(`${this.tiposUrl}/${id}/estado`, dto);
	}
	// #endregion
}
