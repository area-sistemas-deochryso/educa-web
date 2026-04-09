// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@shared/models';
import {
	NotificacionLista,
	NotificacionActiva,
	NotificacionesEstadisticas,
	CrearNotificacionRequest,
	ActualizarNotificacionRequest,
} from '@data/models';
import { ApiResponse } from '@shared/models';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class NotificacionesAdminService {
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/notificaciones`;
	private http = inject(HttpClient);

	// #region Consultas (GET)

	getActivasHoy(): Observable<NotificacionActiva[]> {
		return this.http.get<NotificacionActiva[]>(`${this.apiUrl}/activas`);
	}

	listar(
		anio: number,
		page?: number,
		pageSize?: number,
		search?: string,
		tipo?: string | null,
		prioridad?: string | null,
		estado?: boolean | null,
	): Observable<PaginatedResponse<NotificacionLista>> {
		const params: Record<string, string | number | boolean> = { anio };
		if (page !== undefined) params['page'] = page;
		if (pageSize !== undefined) params['pageSize'] = pageSize;
		if (search) params['search'] = search;
		if (tipo) params['tipo'] = tipo;
		if (prioridad) params['prioridad'] = prioridad;
		if (estado !== undefined && estado !== null) params['estado'] = estado;

		return this.http.get<PaginatedResponse<NotificacionLista>>(`${this.apiUrl}/admin/listar`, { params });
	}

	getEstadisticas(anio: number): Observable<NotificacionesEstadisticas> {
		return this.http.get<NotificacionesEstadisticas>(`${this.apiUrl}/admin/estadisticas`, {
			params: { anio },
		});
	}

	getPorId(id: number): Observable<NotificacionLista> {
		return this.http.get<NotificacionLista>(`${this.apiUrl}/admin/${id}`);
	}

	// #endregion

	// #region Comandos (POST/PUT/DELETE/PATCH)

	crear(request: CrearNotificacionRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/admin/crear`, request);
	}

	actualizar(id: number, request: ActualizarNotificacionRequest): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/admin/${id}/actualizar`, request);
	}

	eliminar(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/admin/${id}/eliminar`);
	}

	toggleEstado(id: number): Observable<ApiResponse> {
		return this.http.patch<ApiResponse>(`${this.apiUrl}/admin/${id}/toggle`, {});
	}

	// #endregion
}
// #endregion
