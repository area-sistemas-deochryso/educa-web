import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '@config/environment';
import {
	EmailOutboxEstadisticas,
	EmailOutboxLista,
	EmailOutboxTendencia,
} from '@data/models/email-outbox.models';

@Injectable({ providedIn: 'root' })
export class EmailOutboxApiService {
	// #region Dependencias
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/email-outbox`;
	// #endregion

	// #region Consultas (GET)
	listar(filtros?: {
		tipo?: string;
		estado?: string;
		desde?: string;
		hasta?: string;
		search?: string;
	}): Observable<EmailOutboxLista[]> {
		let params = new HttpParams();
		if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
		if (filtros?.estado) params = params.set('estado', filtros.estado);
		if (filtros?.desde) params = params.set('desde', filtros.desde);
		if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
		if (filtros?.search) params = params.set('search', filtros.search);

		return this.http
			.get<EmailOutboxLista[]>(`${this.baseUrl}/listar`, { params })
			.pipe(catchError(() => of([])));
	}

	estadisticas(desde?: string, hasta?: string): Observable<EmailOutboxEstadisticas> {
		let params = new HttpParams();
		if (desde) params = params.set('desde', desde);
		if (hasta) params = params.set('hasta', hasta);

		const defaultStats: EmailOutboxEstadisticas = {
			total: 0,
			enviados: 0,
			fallidos: 0,
			pendientes: 0,
			enProceso: 0,
			porcentajeExito: 0,
		};

		return this.http
			.get<EmailOutboxEstadisticas>(`${this.baseUrl}/estadisticas`, { params })
			.pipe(catchError(() => of(defaultStats)));
	}

	tendencias(desde?: string, hasta?: string): Observable<EmailOutboxTendencia[]> {
		let params = new HttpParams();
		if (desde) params = params.set('desde', desde);
		if (hasta) params = params.set('hasta', hasta);

		return this.http
			.get<EmailOutboxTendencia[]>(`${this.baseUrl}/tendencias`, { params })
			.pipe(catchError(() => of([])));
	}

	obtenerHtml(id: number): Observable<string | null> {
		return this.http
			.get<string>(`${this.baseUrl}/${id}/html`)
			.pipe(catchError(() => of(null)));
	}
	// #endregion

	// #region Comandos (POST)
	reintentar(id: number): Observable<boolean> {
		return this.http.post(`${this.baseUrl}/${id}/reintentar`, {}).pipe(
			map(() => true),
			catchError(() => of(false)),
		);
	}
	// #endregion
}
