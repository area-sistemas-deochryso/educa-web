import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '@config/environment';
import {
	EmailOutboxEstadisticas,
	EmailOutboxLista,
	EmailOutboxTendencia,
} from '@data/models';
import { DeferFailStatus } from '../models/defer-fail-status.models';
import { ThrottleStatus } from '../models/throttle-status.models';

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
		tipoFallo?: string;
		correlationId?: string;
		desde?: string;
		hasta?: string;
		search?: string;
		page?: number;
		pageSize?: number;
	}): Observable<EmailOutboxLista[]> {
		let params = this.buildFiltrosParams(filtros);
		if (filtros?.page !== undefined) params = params.set('page', String(filtros.page));
		if (filtros?.pageSize !== undefined)
			params = params.set('pageSize', String(filtros.pageSize));

		return this.http
			.get<EmailOutboxLista[]>(`${this.baseUrl}/listar`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Plan 43 Chat 4.1b — total real para alimentar [totalRecords] del paginador
	 * server-side. Mismos filtros que `/listar` salvo page/pageSize. Fail-safe:
	 * si el endpoint falla, devolvemos null y el componente cae al estimate
	 * progresivo (per `rules/pagination.md` §"Fail-safe del count").
	 */
	count(filtros?: {
		tipo?: string;
		estado?: string;
		tipoFallo?: string;
		correlationId?: string;
		desde?: string;
		hasta?: string;
		search?: string;
	}): Observable<number | null> {
		const params = this.buildFiltrosParams(filtros);
		return this.http
			.get<number>(`${this.baseUrl}/count`, { params })
			.pipe(catchError(() => of(null)));
	}

	private buildFiltrosParams(filtros?: {
		tipo?: string;
		estado?: string;
		tipoFallo?: string;
		correlationId?: string;
		desde?: string;
		hasta?: string;
		search?: string;
	}): HttpParams {
		let params = new HttpParams();
		if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
		if (filtros?.estado) params = params.set('estado', filtros.estado);
		if (filtros?.tipoFallo) params = params.set('tipoFallo', filtros.tipoFallo);
		if (filtros?.correlationId)
			params = params.set('correlationId', filtros.correlationId);
		if (filtros?.desde) params = params.set('desde', filtros.desde);
		if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
		if (filtros?.search) params = params.set('search', filtros.search);
		return params;
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
		// El BE devuelve { html: string } envuelto en ApiResponse; el interceptor
		// desempaqueta hasta el objeto interno. Hay que extraer la propiedad.
		return this.http
			.get<{ html: string } | string | null>(`${this.baseUrl}/${id}/html`)
			.pipe(
				map((res) => (typeof res === 'string' ? res : (res?.html ?? null))),
				catchError(() => of(null)),
			);
	}

	// * Plan 22 Chat B — snapshot del throttle saliente (per-sender + dominio).
	// * El interceptor global desempaqueta ApiResponse<T>, por eso el genérico es T directo.
	throttleStatus(): Observable<ThrottleStatus> {
		return this.http.get<ThrottleStatus>(`${this.baseUrl}/throttle-status`);
	}

	// * Plan 22 Chat B / Plan 29 Chat 2.6 — snapshot agregado del techo
	// * defer/fail cPanel + breakdown 24h + blacklist resumen.
	deferFailStatus(): Observable<DeferFailStatus> {
		return this.http.get<DeferFailStatus>(`${this.baseUrl}/defer-fail-status`);
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
