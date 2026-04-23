import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { environment } from '@config/environment';
import { EmailOutboxLista } from '@data/models/email-outbox.models';

import { EmailDashboardDiaDto } from '../models/email-dashboard-dia.models';

@Injectable({ providedIn: 'root' })
export class EmailOutboxDashboardDiaService {
	// #region Dependencias
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/email-outbox`;
	// #endregion

	// #region Consultas (GET)
	// * Interceptor global desempaqueta ApiResponse<T> → el tipo es T directo.
	obtenerDashboardDia(fecha?: string): Observable<EmailDashboardDiaDto> {
		let params = new HttpParams();
		if (fecha) params = params.set('fecha', fecha);
		return this.http.get<EmailDashboardDiaDto>(`${this.baseUrl}/dashboard-dia`, {
			params,
		});
	}

	/**
	 * Lista los correos en estado FAILED registrados en una fecha. Reusa el endpoint
	 * operativo de la bandeja (`/listar`) con filtros. Si el backend falla (rate
	 * limit, 500, etc.), devuelve lista vacía — la sección solo es informativa.
	 */
	listarFallosDia(fecha: string): Observable<EmailOutboxLista[]> {
		const params = new HttpParams()
			.set('estado', 'FAILED')
			.set('desde', fecha)
			.set('hasta', fecha);
		return this.http
			.get<EmailOutboxLista[]>(`${this.baseUrl}/listar`, { params })
			.pipe(catchError(() => of([])));
	}
	// #endregion
}
