// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@shared/models';
import {
	EventoCalendarioLista,
	EventoCalendarioActivo,
	EventosCalendarioEstadisticas,
	CrearEventoCalendarioRequest,
	ActualizarEventoCalendarioRequest,
	EventoCalendarioApiResponse,
} from '@data/models';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class EventsCalendarService {
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/eventoscalendario`;
	private http = inject(HttpClient);

	// #region Consultas (GET)

	getActivosPorAnio(anio: number): Observable<EventoCalendarioActivo[]> {
		return this.http.get<EventoCalendarioActivo[]>(`${this.apiUrl}/activos`, {
			params: { anio },
		});
	}

	listar(
		anio: number,
		page?: number,
		pageSize?: number,
		search?: string,
		tipo?: string | null,
		estado?: boolean | null,
	): Observable<PaginatedResponse<EventoCalendarioLista>> {
		const params: Record<string, string | number | boolean> = { anio };
		if (page !== undefined) params['page'] = page;
		if (pageSize !== undefined) params['pageSize'] = pageSize;
		if (search) params['search'] = search;
		if (tipo) params['tipo'] = tipo;
		if (estado !== undefined && estado !== null) params['estado'] = estado;

		return this.http.get<PaginatedResponse<EventoCalendarioLista>>(`${this.apiUrl}/admin/listar`, { params });
	}

	getEstadisticas(anio: number): Observable<EventosCalendarioEstadisticas> {
		return this.http.get<EventosCalendarioEstadisticas>(`${this.apiUrl}/admin/estadisticas`, {
			params: { anio },
		});
	}

	getPorId(id: number): Observable<EventoCalendarioLista> {
		return this.http.get<EventoCalendarioLista>(`${this.apiUrl}/admin/${id}`);
	}

	// #endregion

	// #region Comandos (POST/PUT/DELETE/PATCH)

	crear(request: CrearEventoCalendarioRequest): Observable<EventoCalendarioApiResponse> {
		return this.http.post<EventoCalendarioApiResponse>(`${this.apiUrl}/admin/crear`, request);
	}

	actualizar(id: number, request: ActualizarEventoCalendarioRequest): Observable<EventoCalendarioApiResponse> {
		return this.http.put<EventoCalendarioApiResponse>(`${this.apiUrl}/admin/${id}/actualizar`, request);
	}

	eliminar(id: number): Observable<EventoCalendarioApiResponse> {
		return this.http.delete<EventoCalendarioApiResponse>(`${this.apiUrl}/admin/${id}/eliminar`);
	}

	toggleEstado(id: number): Observable<EventoCalendarioApiResponse> {
		return this.http.patch<EventoCalendarioApiResponse>(`${this.apiUrl}/admin/${id}/toggle`, {});
	}

	// #endregion
}
// #endregion
