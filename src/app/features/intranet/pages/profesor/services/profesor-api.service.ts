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

/** Response wrapper used by the API. */
interface ApiResponse<T> {
	data: T;
}

/**
 * API client for professor endpoints.
 */
@Injectable({ providedIn: 'root' })
export class ProfesorApiService {
	private readonly http = inject(HttpClient);
	/** Base URL for schedule endpoints. */
	private readonly horarioUrl = `${environment.apiUrl}/api/Horario`;
	/** Base URL for professor classroom endpoints. */
	private readonly profesorSalonUrl = `${environment.apiUrl}/api/ProfesorSalon`;
	/** Base URL for professor endpoints. */
	private readonly profesorUrl = `${environment.apiUrl}/api/Profesor`;
	/** Base URL for course content endpoints. */
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	/** Base URL for blob storage endpoints. */
	private readonly blobUrl = `${environment.apiUrl}/api/blobstorage`;
	/**
	 * Get schedules for a professor.
	 *
	 * @param profesorId Profesor id.
	 * @returns Observable with schedule list.
	 *
	 * @example
	 * api.getHorarios(profesorId);
	 */
	getHorarios(profesorId: number): Observable<HorarioProfesorDto[]> {
		return this.http
			.get<HorarioProfesorDto[]>(`${this.horarioUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of([])));
	}
	/**
	 * Get tutor classroom for a professor.
	 *
	 * @param profesorId Profesor id.
	 * @returns Observable with tutor classroom response.
	 */
	getSalonTutoria(profesorId: number): Observable<SalonTutoriaResponse> {
		return this.http
			.get<SalonTutoriaResponse>(`${this.profesorSalonUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of({ mensaje: '', data: null })));
	}
	/**
	 * Get professor classrooms with students summary.
	 *
	 * @returns Observable with classrooms and counts.
	 */
	getMisEstudiantes(): Observable<ProfesorMisSalonesConEstudiantesDto> {
		return this.http
			.get<ProfesorMisSalonesConEstudiantesDto>(`${this.profesorUrl}/mis-estudiantes`)
			.pipe(catchError(() => of({ salones: [], totalEstudiantes: 0, totalSalones: 0 })));
	}
	/**
	 * Get students for a classroom.
	 *
	 * @param salonId Classroom id.
	 * @returns Observable with classroom detail or null.
	 */
	getEstudiantesSalon(salonId: number): Observable<ProfesorSalonConEstudiantesDto | null> {
		return this.http
			.get<ProfesorSalonConEstudiantesDto>(`${this.profesorUrl}/estudiantes-salon/${salonId}`)
			.pipe(catchError(() => of(null)));
	}

	// #region Curso Contenido
	/**
	 * Get course content for a schedule.
	 *
	 * @param horarioId Schedule id.
	 * @returns Observable with content detail or null.
	 */
	getContenido(horarioId: number): Observable<ApiResponse<CursoContenidoDetalleDto | null>> {
		return this.http.get<ApiResponse<CursoContenidoDetalleDto | null>>(
			`${this.contenidoUrl}/horario/${horarioId}`,
		);
	}
	/**
	 * Create course content for a schedule.
	 *
	 * @param request Creation payload.
	 * @returns Observable with created content detail.
	 */
	crearContenido(request: CrearCursoContenidoRequest): Observable<ApiResponse<CursoContenidoDetalleDto>> {
		return this.http.post<ApiResponse<CursoContenidoDetalleDto>>(this.contenidoUrl, request);
	}
	/**
	 * Delete course content by id.
	 *
	 * @param id Content id.
	 * @returns Observable with confirmation message.
	 */
	eliminarContenido(id: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/${id}`);
	}
	/**
	 * Update a week in course content.
	 *
	 * @param semanaId Week id.
	 * @param request Update payload.
	 * @returns Observable with updated week detail.
	 */
	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): Observable<ApiResponse<CursoContenidoSemanaDto>> {
		return this.http.put<ApiResponse<CursoContenidoSemanaDto>>(
			`${this.contenidoUrl}/semana/${semanaId}`,
			request,
		);
	}
	/**
	 * Register attachment metadata for a week.
	 *
	 * @param semanaId Week id.
	 * @param request Attachment metadata payload.
	 * @returns Observable with created attachment detail.
	 */
	registrarArchivo(semanaId: number, request: RegistrarArchivoRequest): Observable<ApiResponse<CursoContenidoArchivoDto>> {
		return this.http.post<ApiResponse<CursoContenidoArchivoDto>>(
			`${this.contenidoUrl}/semana/${semanaId}/archivo`,
			request,
		);
	}
	/**
	 * Delete an attachment by id.
	 *
	 * @param archivoId Attachment id.
	 * @returns Observable with confirmation message.
	 */
	eliminarArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/archivo/${archivoId}`);
	}
	/**
	 * Create a task for a week.
	 *
	 * @param semanaId Week id.
	 * @param request Task creation payload.
	 * @returns Observable with created task detail.
	 */
	crearTarea(semanaId: number, request: CrearTareaRequest): Observable<ApiResponse<CursoContenidoTareaDto>> {
		return this.http.post<ApiResponse<CursoContenidoTareaDto>>(
			`${this.contenidoUrl}/semana/${semanaId}/tarea`,
			request,
		);
	}
	/**
	 * Update a task by id.
	 *
	 * @param tareaId Task id.
	 * @param request Task update payload.
	 * @returns Observable with updated task detail.
	 */
	actualizarTarea(tareaId: number, request: ActualizarTareaRequest): Observable<ApiResponse<CursoContenidoTareaDto>> {
		return this.http.put<ApiResponse<CursoContenidoTareaDto>>(
			`${this.contenidoUrl}/tarea/${tareaId}`,
			request,
		);
	}
	/**
	 * Delete a task by id.
	 *
	 * @param tareaId Task id.
	 * @returns Observable with confirmation message.
	 */
	eliminarTarea(tareaId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/tarea/${tareaId}`);
	}

	// #endregion
	// #region Blob Storage (file upload)
	/**
	 * Upload a file to blob storage.
	 *
	 * @param file File to upload.
	 * @returns Observable with upload result URL and file name.
	 */
	uploadFile(file: File): Observable<{ url: string; fileName: string }> {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('containerName', 'curso-contenido');
		formData.append('appendTimestamp', 'true');
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}
	// #endregion
}