import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@config/environment';
import {
	HorarioProfesorDto,
	CursoContenidoDetalleDto,
	EstudianteArchivoDto,
	RegistrarEstudianteArchivoRequest,
	EstudianteTareaArchivoDto,
	RegistrarEstudianteTareaArchivoRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EstudianteApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/EstudianteCurso`;
	private readonly blobUrl = `${environment.apiUrl}/api/blobstorage`;

	// #region Consultas

	getMisHorarios(): Observable<HorarioProfesorDto[]> {
		return this.http
			.get<HorarioProfesorDto[]>(`${this.baseUrl}/mis-horarios`)
			.pipe(catchError(() => of([])));
	}

	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.http.get<CursoContenidoDetalleDto | null>(
			`${this.baseUrl}/horario/${horarioId}/contenido`,
		);
	}

	getMisArchivos(semanaId: number): Observable<EstudianteArchivoDto[]> {
		return this.http
			.get<EstudianteArchivoDto[]>(`${this.baseUrl}/semana/${semanaId}/mis-archivos`)
			.pipe(catchError(() => of([])));
	}

	// #endregion
	// #region Comandos

	registrarArchivo(semanaId: number, request: RegistrarEstudianteArchivoRequest): Observable<EstudianteArchivoDto> {
		return this.http.post<EstudianteArchivoDto>(
			`${this.baseUrl}/semana/${semanaId}/archivo`,
			request,
		);
	}

	eliminarArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.baseUrl}/archivo/${archivoId}`);
	}

	uploadFile(file: File): Observable<{ url: string; fileName: string }> {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('containerName', 'curso-contenido');
		formData.append('appendTimestamp', 'true');
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}

	// #endregion
	// #region Student task file commands

	getMisTareaArchivos(tareaId: number): Observable<EstudianteTareaArchivoDto[]> {
		return this.http
			.get<EstudianteTareaArchivoDto[]>(`${this.baseUrl}/tarea/${tareaId}/mis-archivos`)
			.pipe(catchError(() => of([])));
	}

	registrarTareaArchivo(tareaId: number, request: RegistrarEstudianteTareaArchivoRequest): Observable<EstudianteTareaArchivoDto> {
		return this.http.post<EstudianteTareaArchivoDto>(
			`${this.baseUrl}/tarea/${tareaId}/archivo`,
			request,
		);
	}

	eliminarTareaArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.baseUrl}/tarea-archivo/${archivoId}`);
	}

	// #endregion
}
