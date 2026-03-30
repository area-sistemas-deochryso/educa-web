import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@config/environment';
import { FileUploadBuilder } from '@core/helpers';
import {
	HorarioProfesorDto,
	SalonTutoriaDto,
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
	SemanaEstudianteArchivosDto,
	TareaArchivoDto,
	RegistrarTareaArchivoRequest,
	EstudianteTareaArchivosGroupDto,
	CalificacionConNotasDto,
	CrearCalificacionDto,
	CalificarLoteDto,
	ActualizarNotaDto,
	PeriodoCalificacionDto,
	CrearPeriodoDto,
	SalonNotasResumenDto,
	GruposResumenDto,
	CrearGrupoDto,
	GrupoContenidoDto,
	ActualizarGrupoDto,
	AsignarEstudiantesGrupoDto,
	ConfigurarMaxEstudiantesDto,
	CalificarGruposLoteDto,
	CambiarTipoCalificacionDto,
	AsistenciaCursoFechaDto,
	RegistrarAsistenciaCursoDto,
	AsistenciaCursoResumenDto,
} from '../models';

/**
 * API client for professor endpoints.
 *
 * NOTE: The apiResponseInterceptor already unwraps { success, data } envelopes,
 * so return types here reflect the unwrapped payload (T, not ApiResponse<T>).
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
	getSalonTutoria(profesorId: number): Observable<SalonTutoriaDto | null> {
		return this.http
			.get<SalonTutoriaDto>(`${this.profesorSalonUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of(null)));
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
	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.http.get<CursoContenidoDetalleDto | null>(
			`${this.contenidoUrl}/horario/${horarioId}`,
		);
	}
	/**
	 * Create course content for a schedule.
	 *
	 * @param request Creation payload.
	 * @returns Observable with created content detail.
	 */
	crearContenido(request: CrearCursoContenidoRequest): Observable<CursoContenidoDetalleDto> {
		return this.http.post<CursoContenidoDetalleDto>(this.contenidoUrl, request);
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
	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): Observable<CursoContenidoSemanaDto> {
		return this.http.put<CursoContenidoSemanaDto>(
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
	registrarArchivo(semanaId: number, request: RegistrarArchivoRequest): Observable<CursoContenidoArchivoDto> {
		return this.http.post<CursoContenidoArchivoDto>(
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
	crearTarea(semanaId: number, request: CrearTareaRequest): Observable<CursoContenidoTareaDto> {
		return this.http.post<CursoContenidoTareaDto>(
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
	actualizarTarea(tareaId: number, request: ActualizarTareaRequest): Observable<CursoContenidoTareaDto> {
		return this.http.put<CursoContenidoTareaDto>(
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

	/**
	 * Get all student-uploaded files for a content (professor view).
	 */
	getArchivosEstudiantes(contenidoId: number): Observable<SemanaEstudianteArchivosDto[]> {
		return this.http.get<SemanaEstudianteArchivosDto[]>(
			`${this.contenidoUrl}/${contenidoId}/archivos-estudiantes`,
		);
	}

	/**
	 * Register teacher attachment metadata for a task.
	 */
	registrarTareaArchivo(tareaId: number, request: RegistrarTareaArchivoRequest): Observable<TareaArchivoDto> {
		return this.http.post<TareaArchivoDto>(
			`${this.contenidoUrl}/tarea/${tareaId}/archivo`,
			request,
		);
	}
	/**
	 * Delete a teacher attachment from a task.
	 */
	eliminarTareaArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/tarea-archivo/${archivoId}`);
	}
	/**
	 * Get all student-uploaded files for a task (professor view).
	 */
	getArchivosTareaEstudiantes(tareaId: number): Observable<EstudianteTareaArchivosGroupDto[]> {
		return this.http.get<EstudianteTareaArchivosGroupDto[]>(
			`${this.contenidoUrl}/tarea/${tareaId}/archivos-estudiantes`,
		);
	}
	// #endregion
	// #endregion

	// #region Calificaciones
	/** Base URL for grading endpoints. */
	private readonly calificacionUrl = `${environment.apiUrl}/api/Calificacion`;

	getCalificaciones(contenidoId: number): Observable<CalificacionConNotasDto[]> {
		return this.http.get<CalificacionConNotasDto[]>(
			`${this.calificacionUrl}/contenido/${contenidoId}`,
		);
	}

	crearCalificacion(dto: CrearCalificacionDto): Observable<CalificacionConNotasDto> {
		return this.http.post<CalificacionConNotasDto>(this.calificacionUrl, dto);
	}

	calificarLote(calificacionId: number, dto: CalificarLoteDto): Observable<void> {
		return this.http.post<void>(`${this.calificacionUrl}/${calificacionId}/calificar`, dto);
	}

	actualizarNota(notaId: number, dto: ActualizarNotaDto): Observable<void> {
		return this.http.put<void>(`${this.calificacionUrl}/nota/${notaId}`, dto);
	}

	eliminarCalificacion(calificacionId: number): Observable<void> {
		return this.http.delete<void>(`${this.calificacionUrl}/${calificacionId}`);
	}

	eliminarNotaEstudiante(calificacionId: number, estudianteId: number): Observable<void> {
		return this.http.delete<void>(
			`${this.calificacionUrl}/${calificacionId}/estudiante/${estudianteId}`,
		);
	}

	cambiarTipoCalificacion(
		calificacionId: number,
		dto: CambiarTipoCalificacionDto,
	): Observable<CalificacionConNotasDto> {
		return this.http.put<CalificacionConNotasDto>(
			`${this.calificacionUrl}/${calificacionId}/tipo`,
			dto,
		);
	}

	getPeriodos(contenidoId: number): Observable<PeriodoCalificacionDto[]> {
		return this.http.get<PeriodoCalificacionDto[]>(
			`${this.calificacionUrl}/periodos/${contenidoId}`,
		);
	}

	crearPeriodo(dto: CrearPeriodoDto): Observable<PeriodoCalificacionDto> {
		return this.http.post<PeriodoCalificacionDto>(`${this.calificacionUrl}/periodo`, dto);
	}

	eliminarPeriodo(periodoId: number): Observable<void> {
		return this.http.delete<void>(`${this.calificacionUrl}/periodo/${periodoId}`);
	}

	getNotasSalon(salonId: number, cursoId: number): Observable<SalonNotasResumenDto> {
		return this.http.get<SalonNotasResumenDto>(
			`${this.calificacionUrl}/salon/${salonId}/curso/${cursoId}`,
		);
	}
	// #endregion

	// #region Grupos
	/** Base URL for group endpoints. */
	private readonly grupoUrl = `${environment.apiUrl}/api/GrupoContenido`;

	getGrupos(contenidoId: number): Observable<GruposResumenDto> {
		return this.http.get<GruposResumenDto>(`${this.grupoUrl}/contenido/${contenidoId}`);
	}

	crearGrupo(dto: CrearGrupoDto): Observable<GrupoContenidoDto> {
		return this.http.post<GrupoContenidoDto>(this.grupoUrl, dto);
	}

	actualizarGrupo(grupoId: number, dto: ActualizarGrupoDto): Observable<void> {
		return this.http.put<void>(`${this.grupoUrl}/${grupoId}`, dto);
	}

	eliminarGrupo(grupoId: number): Observable<void> {
		return this.http.delete<void>(`${this.grupoUrl}/${grupoId}`);
	}

	asignarEstudiantes(grupoId: number, dto: AsignarEstudiantesGrupoDto): Observable<void> {
		return this.http.post<void>(`${this.grupoUrl}/${grupoId}/estudiantes`, dto);
	}

	removerEstudianteDeGrupo(grupoId: number, estudianteId: number): Observable<void> {
		return this.http.delete<void>(`${this.grupoUrl}/${grupoId}/estudiante/${estudianteId}`);
	}

	configurarMaxEstudiantes(contenidoId: number, dto: ConfigurarMaxEstudiantesDto): Observable<void> {
		return this.http.put<void>(`${this.grupoUrl}/contenido/${contenidoId}/config`, dto);
	}

	calificarGruposLote(calificacionId: number, dto: CalificarGruposLoteDto): Observable<void> {
		return this.http.post<void>(`${this.grupoUrl}/${calificacionId}/calificar-grupos`, dto);
	}
	// #endregion

	// #region Asistencia Curso
	/** Base URL for course attendance endpoints. */
	private readonly asistenciaCursoUrl = `${environment.apiUrl}/api/AsistenciaCurso`;

	getAsistenciaCursoFecha(horarioId: number, fecha: string): Observable<AsistenciaCursoFechaDto> {
		return this.http.get<AsistenciaCursoFechaDto>(
			`${this.asistenciaCursoUrl}/horario/${horarioId}/fecha`,
			{ params: { fecha } },
		);
	}

	registrarAsistenciaCurso(horarioId: number, dto: RegistrarAsistenciaCursoDto): Observable<void> {
		return this.http.post<void>(
			`${this.asistenciaCursoUrl}/horario/${horarioId}/registrar`,
			dto,
		);
	}

	getAsistenciaCursoResumen(
		horarioId: number,
		fechaInicio: string,
		fechaFin: string,
	): Observable<AsistenciaCursoResumenDto> {
		return this.http.get<AsistenciaCursoResumenDto>(
			`${this.asistenciaCursoUrl}/horario/${horarioId}/resumen`,
			{ params: { fechaInicio, fechaFin } },
		);
	}
	// #endregion

	// #region Server Time
	/** Lightweight call to get UTC server time for clock sync. Returns null if unavailable. */
	getServerTime(): Observable<string | null> {
		return this.http
			.get<string>(`${environment.apiUrl}/api/ServerTime`)
			.pipe(catchError(() => of(null)));
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
		const formData = FileUploadBuilder.create(file)
			.container('curso-contenido')
			.withTimestamp()
			.build();
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}
	// #endregion
}