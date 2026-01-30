import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@config/environment';
import { Curso, CrearCursoRequest, ActualizarCursoRequest, ApiResponse } from './cursos.models';

@Injectable({
	providedIn: 'root',
})
export class CursosService {
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/cursos`;
	private http = inject(HttpClient);

	getCursos(): Observable<Curso[]> {
		return this.http.get<Curso[]>(`${this.apiUrl}/listar`).pipe(catchError(() => of([])));
	}

	getCurso(id: number): Observable<Curso | null> {
		return this.http.get<Curso>(`${this.apiUrl}/${id}`).pipe(catchError(() => of(null)));
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
