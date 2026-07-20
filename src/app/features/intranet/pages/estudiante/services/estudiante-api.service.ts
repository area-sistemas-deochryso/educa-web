import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, catchError, throwError } from 'rxjs';
import { environment } from '@config/environment';
import { FileUploadBuilder } from '@core/helpers';
import {
	HorarioProfesorDto,
	CursoContenidoDetalleDto,
	EstudianteArchivoDto,
	RegistrarEstudianteArchivoRequest,
	EstudianteTareaArchivoDto,
	RegistrarEstudianteTareaArchivoRequest,
	EstudianteMisNotasDto,
	MiAsistenciaCursoResumenDto,
	GruposResumenDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EstudianteApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/EstudianteCurso`;
	private readonly blobUrl = `${environment.apiUrl}/api/blobstorage`;

	// #region Consultas

	// Session-cached: attendance/foro/mensajeria/notas/horarios/salones each call this
	// on their own init, so without caching the same horarios get re-fetched on every
	// route the student navigates to. Reset on error so a failed attempt retries.
	private misHorarios$: Observable<HorarioProfesorDto[]> | null = null;

	getMisHorarios(): Observable<HorarioProfesorDto[]> {
		if (!this.misHorarios$) {
			this.misHorarios$ = this.http.get<HorarioProfesorDto[]>(`${this.baseUrl}/mis-horarios`).pipe(
				shareReplay(1),
				catchError((err) => {
					this.misHorarios$ = null;
					return throwError(() => err);
				}),
			);
		}
		return this.misHorarios$;
	}

	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.http.get<CursoContenidoDetalleDto | null>(
			`${this.baseUrl}/horario/${horarioId}/contenido`,
		);
	}

	getMisArchivos(semanaId: number): Observable<EstudianteArchivoDto[]> {
		return this.http.get<EstudianteArchivoDto[]>(`${this.baseUrl}/semana/${semanaId}/mis-archivos`);
	}

	getMisNotas(): Observable<EstudianteMisNotasDto[]> {
		return this.http.get<EstudianteMisNotasDto[]>(`${this.baseUrl}/mis-notas`);
	}

	getMisNotasCurso(contenidoId: number): Observable<EstudianteMisNotasDto> {
		return this.http.get<EstudianteMisNotasDto>(`${this.baseUrl}/mis-notas/${contenidoId}`);
	}

	getServerTime(): Observable<string | null> {
		return this.http.get<string>(`${environment.apiUrl}/api/ServerTime`);
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
		const formData = FileUploadBuilder.create(file)
			.container('curso-contenido')
			.withTimestamp()
			.build();
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}

	// #endregion
	// #region Student task file commands

	getMisTareaArchivos(tareaId: number): Observable<EstudianteTareaArchivoDto[]> {
		return this.http.get<EstudianteTareaArchivoDto[]>(`${this.baseUrl}/tarea/${tareaId}/mis-archivos`);
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

	// #region Salon endpoints

	getMiAsistencia(horarioId: number): Observable<MiAsistenciaCursoResumenDto | null> {
		return this.http.get<MiAsistenciaCursoResumenDto>(`${this.baseUrl}/horario/${horarioId}/mi-asistencia`);
	}

	getGruposHorario(horarioId: number): Observable<GruposResumenDto | null> {
		return this.http.get<GruposResumenDto>(`${this.baseUrl}/horario/${horarioId}/grupos`);
	}

	// #endregion
}
