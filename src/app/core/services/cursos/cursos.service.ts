// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@data/repositories';
import { Curso, CrearCursoRequest, ActualizarCursoRequest, ApiResponse, CursosEstadisticas } from './cursos.models';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class CursosService {
	// * CRUD wrapper for cursos endpoints.
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/cursos`;
	private http = inject(HttpClient);

	getCursos(): Observable<Curso[]> {
		return this.http.get<Curso[]>(`${this.apiUrl}/listar`);
	}

	getCursosPaginated(
		page: number,
		pageSize: number,
		search?: string,
		estado?: boolean | null,
		nivel?: string | null,
	): Observable<PaginatedResponse<Curso>> {
		const params: Record<string, string | number | boolean> = { page, pageSize };
		if (search) params['search'] = search;
		if (estado !== undefined && estado !== null) params['estado'] = estado;
		if (nivel) params['nivel'] = nivel;

		return this.http.get<PaginatedResponse<Curso>>(`${this.apiUrl}/listar`, { params });
	}

	getEstadisticas(): Observable<CursosEstadisticas> {
		return this.http.get<CursosEstadisticas>(`${this.apiUrl}/estadisticas`);
	}

	getCurso(id: number): Observable<Curso> {
		return this.http.get<Curso>(`${this.apiUrl}/${id}`);
	}

	crearCurso(request: CrearCursoRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/crear`, request);
	}

	actualizarCurso(id: number, request: ActualizarCursoRequest): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/${id}/actualizar`, request);
	}

	eliminarCurso(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}/eliminar`);
	}
}
// #endregion
