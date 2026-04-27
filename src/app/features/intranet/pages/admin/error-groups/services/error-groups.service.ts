import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	CambiarEstadoErrorGroup,
	ErrorGroupDetalle,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorLogCompleto,
	ErrorOrigen,
	ErrorSeveridad,
	OcurrenciaLista,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/error-groups`;
	private readonly apiUrlOcurrencia = `${environment.apiUrl}/api/sistema/errors`;

	// #region Consultas

	getList(
		estado: ErrorGroupEstado | null,
		severidad: ErrorSeveridad | null,
		origen: ErrorOrigen | null,
		q: string | null,
		pagina = 1,
		pageSize = 20,
	): Observable<ErrorGroupLista[]> {
		const params: Record<string, string | number> = { pagina, pageSize };
		if (estado) params['estado'] = estado;
		if (severidad) params['severidad'] = severidad;
		if (origen) params['origen'] = origen;
		if (q) params['q'] = q;
		return this.http.get<ErrorGroupLista[]>(this.apiUrl, { params });
	}

	getCount(
		estado: ErrorGroupEstado | null,
		severidad: ErrorSeveridad | null,
		origen: ErrorOrigen | null,
		q: string | null,
	): Observable<number> {
		const params: Record<string, string> = {};
		if (estado) params['estado'] = estado;
		if (severidad) params['severidad'] = severidad;
		if (origen) params['origen'] = origen;
		if (q) params['q'] = q;
		return this.http.get<number>(`${this.apiUrl}/count`, { params });
	}

	getDetalle(id: number): Observable<ErrorGroupDetalle> {
		return this.http.get<ErrorGroupDetalle>(`${this.apiUrl}/${id}`);
	}

	getOcurrencias(grupoId: number, pagina = 1, pageSize = 20): Observable<OcurrenciaLista[]> {
		const params = { pagina, pageSize };
		return this.http.get<OcurrenciaLista[]>(`${this.apiUrl}/${grupoId}/ocurrencias`, { params });
	}

	/**
	 * Detalle completo de una ocurrencia (incluye stack/breadcrumbs/payloads).
	 * Reusa el endpoint legacy de error-logs porque el sub-drawer lo necesita
	 * tal cual lo usaba antes de la migración a grupos.
	 */
	getOcurrenciaCompleta(errorId: number): Observable<ErrorLogCompleto> {
		return this.http.get<ErrorLogCompleto>(`${this.apiUrlOcurrencia}/${errorId}`);
	}

	// #endregion

	// #region Mutaciones

	cambiarEstado(id: number, dto: CambiarEstadoErrorGroup): Observable<string> {
		return this.http.patch<string>(`${this.apiUrl}/${id}/estado`, dto);
	}

	// #endregion
}
