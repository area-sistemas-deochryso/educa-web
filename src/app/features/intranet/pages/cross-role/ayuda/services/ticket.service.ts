import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { CrearTicketDto, TicketDto, TicketTipoDto } from '../models/ticket.models';

/**
 * Gateway de los endpoints de Ticket del panel de ayuda. Entidad propia,
 * independiente del sistema de "Reportar" existente (ver `api-catalog.md`
 * § Ayuda > Ticket).
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/tickets`;

	getTipos(): Observable<TicketTipoDto[]> {
		return this.http.get<TicketTipoDto[]>(`${this.apiUrl}/tipos`);
	}

	crear(dto: CrearTicketDto): Observable<TicketDto> {
		return this.http.post<TicketDto>(this.apiUrl, dto);
	}

	getMios(): Observable<TicketDto[]> {
		return this.http.get<TicketDto[]>(`${this.apiUrl}/mios`);
	}
}
