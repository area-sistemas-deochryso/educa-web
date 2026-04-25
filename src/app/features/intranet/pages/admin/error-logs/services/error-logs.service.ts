import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { ErrorLogCompleto, ErrorLogDetalle, ErrorLogLista } from '../models';

@Injectable({ providedIn: 'root' })
export class ErrorLogsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/errors`;

	// #region Consultas

	getErrores(
		origen: string | null,
		severidad: string | null,
		correlationId: string | null,
		pagina = 1,
		pageSize = 20,
		httpFilter: string | null = null,
		usuarioRol: string | null = null,
	): Observable<ErrorLogLista[]> {
		const params: Record<string, string | number> = { pagina, pageSize };
		if (origen) params['origen'] = origen;
		if (severidad) params['severidad'] = severidad;
		if (correlationId) params['correlationId'] = correlationId;
		if (httpFilter) params['httpFilter'] = httpFilter;
		if (usuarioRol) params['usuarioRol'] = usuarioRol;

		return this.http.get<ErrorLogLista[]>(this.apiUrl, { params });
	}

	getDetalles(errorId: number): Observable<ErrorLogDetalle[]> {
		return this.http.get<ErrorLogDetalle[]>(`${this.apiUrl}/${errorId}/detalles`);
	}

	getCompleto(errorId: number): Observable<ErrorLogCompleto> {
		return this.http.get<ErrorLogCompleto>(`${this.apiUrl}/${errorId}`);
	}

	/**
	 * Total de errores que matchean los filtros. El componente lo consume para
	 * mostrar el número real de páginas en el paginador (antes hacía estimación
	 * progresiva: solo descubría más páginas avanzando una a una).
	 */
	getCount(
		origen: string | null,
		severidad: string | null,
		correlationId: string | null,
		httpFilter: string | null = null,
		usuarioRol: string | null = null,
	): Observable<number> {
		const params: Record<string, string> = {};
		if (origen) params['origen'] = origen;
		if (severidad) params['severidad'] = severidad;
		if (correlationId) params['correlationId'] = correlationId;
		if (httpFilter) params['httpFilter'] = httpFilter;
		if (usuarioRol) params['usuarioRol'] = usuarioRol;

		return this.http.get<number>(`${this.apiUrl}/count`, { params });
	}

	// #endregion

	// #region Mutaciones

	deleteError(errorId: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${errorId}`);
	}

	// #endregion
}
