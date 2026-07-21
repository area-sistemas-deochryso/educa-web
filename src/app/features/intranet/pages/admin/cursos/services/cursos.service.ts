// #region Imports
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { Curso, CrearCursoRequest, ActualizarCursoRequest, CursosEstadisticas, CursoCompletitud } from '../models';
import { ApiResponse } from '@shared/models';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class CursosService {
	// * CRUD wrapper for cursos endpoints.
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/cursos`;
	private http = inject(HttpClient);

	getCursos(search?: string, estado?: boolean | null, nivel?: string | null): Observable<Curso[]> {
		const params: Record<string, string | boolean> = {};
		if (search) params['search'] = search;
		if (estado !== undefined && estado !== null) params['estado'] = estado;
		if (nivel) params['nivel'] = nivel;

		return this.http.get<Curso[]>(`${this.apiUrl}/listar`, { params });
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

	toggleEstado(id: number, rowVersion: string): Observable<{ estado: boolean; rowVersion: string }> {
		return this.http.patch<{ estado: boolean; rowVersion: string }>(`${this.apiUrl}/${id}/toggle-estado`, { rowVersion });
	}

	eliminarCurso(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}/eliminar`);
	}

	/**
	 * Completitud académica por curso (P84 F1): profesor asignado / horario creado / conflictos.
	 * Sin `cursoIds`, el backend devuelve todos los cursos activos.
	 */
	getCompletitud(cursoIds?: number[]): Observable<CursoCompletitud[]> {
		const params: Record<string, string> = {};
		if (cursoIds?.length) params['cursoIds'] = cursoIds.join(',');

		return this.http.get<CursoCompletitud[]>(`${this.apiUrl}/completitud`, { params });
	}
}
// #endregion
