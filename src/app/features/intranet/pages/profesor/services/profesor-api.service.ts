import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@config/environment';
import {
	HorarioProfesorDto,
	SalonTutoriaResponse,
	ProfesorMisSalonesConEstudiantesDto,
	ProfesorSalonConEstudiantesDto,
	CursoContenidoDetalleDto,
	CrearCursoContenidoRequest,
	ActualizarSemanaRequest,
	CursoContenidoSemanaDto,
	RegistrarArchivoRequest,
	CursoContenidoArchivoDto,
	CrearTareaRequest,
	ActualizarTareaRequest,
	CursoContenidoTareaDto,
} from '../models';

interface ApiResponse<T> {
	data: T;
}

@Injectable({ providedIn: 'root' })
export class ProfesorApiService {
	private readonly http = inject(HttpClient);
	private readonly horarioUrl = `${environment.apiUrl}/api/Horario`;
	private readonly profesorSalonUrl = `${environment.apiUrl}/api/ProfesorSalon`;
	private readonly profesorUrl = `${environment.apiUrl}/api/Profesor`;
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	private readonly blobUrl = `${environment.apiUrl}/api/blobstorage`;

	getHorarios(profesorId: number): Observable<HorarioProfesorDto[]> {
		return this.http
			.get<HorarioProfesorDto[]>(`${this.horarioUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of([])));
	}

	getSalonTutoria(profesorId: number): Observable<SalonTutoriaResponse> {
		return this.http
			.get<SalonTutoriaResponse>(`${this.profesorSalonUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of({ mensaje: '', data: null })));
	}

	getMisEstudiantes(): Observable<ProfesorMisSalonesConEstudiantesDto> {
		return this.http
			.get<ProfesorMisSalonesConEstudiantesDto>(`${this.profesorUrl}/mis-estudiantes`)
			.pipe(catchError(() => of({ salones: [], totalEstudiantes: 0, totalSalones: 0 })));
	}

	getEstudiantesSalon(salonId: number): Observable<ProfesorSalonConEstudiantesDto | null> {
		return this.http
			.get<ProfesorSalonConEstudiantesDto>(`${this.profesorUrl}/estudiantes-salon/${salonId}`)
			.pipe(catchError(() => of(null)));
	}

	// ============ Curso Contenido ============

	getContenido(horarioId: number): Observable<ApiResponse<CursoContenidoDetalleDto | null>> {
		return this.http.get<ApiResponse<CursoContenidoDetalleDto | null>>(
			`${this.contenidoUrl}/horario/${horarioId}`,
		);
	}

	crearContenido(request: CrearCursoContenidoRequest): Observable<ApiResponse<CursoContenidoDetalleDto>> {
		return this.http.post<ApiResponse<CursoContenidoDetalleDto>>(this.contenidoUrl, request);
	}

	eliminarContenido(id: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/${id}`);
	}

	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): Observable<ApiResponse<CursoContenidoSemanaDto>> {
		return this.http.put<ApiResponse<CursoContenidoSemanaDto>>(
			`${this.contenidoUrl}/semana/${semanaId}`,
			request,
		);
	}

	registrarArchivo(semanaId: number, request: RegistrarArchivoRequest): Observable<ApiResponse<CursoContenidoArchivoDto>> {
		return this.http.post<ApiResponse<CursoContenidoArchivoDto>>(
			`${this.contenidoUrl}/semana/${semanaId}/archivo`,
			request,
		);
	}

	eliminarArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/archivo/${archivoId}`);
	}

	crearTarea(semanaId: number, request: CrearTareaRequest): Observable<ApiResponse<CursoContenidoTareaDto>> {
		return this.http.post<ApiResponse<CursoContenidoTareaDto>>(
			`${this.contenidoUrl}/semana/${semanaId}/tarea`,
			request,
		);
	}

	actualizarTarea(tareaId: number, request: ActualizarTareaRequest): Observable<ApiResponse<CursoContenidoTareaDto>> {
		return this.http.put<ApiResponse<CursoContenidoTareaDto>>(
			`${this.contenidoUrl}/tarea/${tareaId}`,
			request,
		);
	}

	eliminarTarea(tareaId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/tarea/${tareaId}`);
	}

	// ============ Blob Storage (file upload) ============

	uploadFile(file: File): Observable<{ url: string; fileName: string }> {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('containerName', 'curso-contenido');
		formData.append('appendTimestamp', 'true');
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}
}
