import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@config/environment';
import { type ProfesorCursoListaDto, type AsignarProfesorCursoRequest } from '@data/models';

@Injectable({ providedIn: 'root' })
export class ProfesorCursoApiService {
	private readonly apiUrl = `${environment.apiUrl}/api/profesorcurso`;
	private http = inject(HttpClient);

	/** Profesores asignados a un curso en un año. */
	listarPorCurso(cursoId: number, anio: number): Observable<ProfesorCursoListaDto[]> {
		return this.http
			.get<ProfesorCursoListaDto[]>(`${this.apiUrl}/curso/${cursoId}`, { params: { anio } })
			.pipe(catchError(() => of([])));
	}

	/** Cursos asignados a un profesor en un año. */
	listarPorProfesor(profesorId: number, anio: number): Observable<ProfesorCursoListaDto[]> {
		return this.http
			.get<ProfesorCursoListaDto[]>(`${this.apiUrl}/profesor/${profesorId}`, { params: { anio } })
			.pipe(catchError(() => of([])));
	}

	/** Asignar cursos a un profesor (batch, idempotente). */
	asignar(request: AsignarProfesorCursoRequest): Observable<ProfesorCursoListaDto[]> {
		return this.http.post<ProfesorCursoListaDto[]>(`${this.apiUrl}/asignar`, request);
	}

	/** Desasignar un ProfesorCurso (soft-delete). */
	desasignar(profesorCursoId: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${profesorCursoId}`);
	}
}
