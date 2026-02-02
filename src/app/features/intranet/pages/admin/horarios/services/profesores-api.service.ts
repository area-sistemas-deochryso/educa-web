import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@config/environment';
import { ProfesorListDto } from '../models/profesor.interface';

@Injectable({ providedIn: 'root' })
export class ProfesoresApiService {
	private readonly apiUrl = `${environment.apiUrl}/api/profesor`;
	private http = inject(HttpClient);

	/**
	 * Listar todos los profesores activos
	 */
	listar(): Observable<ProfesorListDto[]> {
		return this.http
			.get<ProfesorListDto[]>(`${this.apiUrl}`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Listar profesores disponibles (activos)
	 * Puede usarse para filtrar solo los que no tienen asignaciones en ciertos horarios
	 */
	listarDisponibles(): Observable<ProfesorListDto[]> {
		return this.http
			.get<ProfesorListDto[]>(`${this.apiUrl}/disponibles`)
			.pipe(catchError(() => of([])));
	}
}
