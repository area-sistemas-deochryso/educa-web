import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { FileUploadBuilder } from '@core/helpers';
import {
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
} from '../models';

/**
 * API client: contenido de curso, calificaciones, grupos y upload de archivos.
 *
 * NOTE: apiResponseInterceptor unwraps { success, data }; return types
 * reflect the unwrapped payload.
 */
@Injectable({ providedIn: 'root' })
export class ProfesorCursosApiService {
	private readonly http = inject(HttpClient);
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	private readonly calificacionUrl = `${environment.apiUrl}/api/Calificacion`;
	private readonly grupoUrl = `${environment.apiUrl}/api/GrupoContenido`;
	private readonly blobUrl = `${environment.apiUrl}/api/blobstorage`;

	// #region Curso Contenido
	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.http.get<CursoContenidoDetalleDto | null>(
			`${this.contenidoUrl}/horario/${horarioId}`,
		);
	}

	crearContenido(request: CrearCursoContenidoRequest): Observable<CursoContenidoDetalleDto> {
		return this.http.post<CursoContenidoDetalleDto>(this.contenidoUrl, request);
	}

	eliminarContenido(id: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/${id}`);
	}

	actualizarSemana(
		semanaId: number,
		request: ActualizarSemanaRequest,
	): Observable<CursoContenidoSemanaDto> {
		return this.http.put<CursoContenidoSemanaDto>(
			`${this.contenidoUrl}/semana/${semanaId}`,
			request,
		);
	}

	registrarArchivo(
		semanaId: number,
		request: RegistrarArchivoRequest,
	): Observable<CursoContenidoArchivoDto> {
		return this.http.post<CursoContenidoArchivoDto>(
			`${this.contenidoUrl}/semana/${semanaId}/archivo`,
			request,
		);
	}

	eliminarArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/archivo/${archivoId}`);
	}

	crearTarea(semanaId: number, request: CrearTareaRequest): Observable<CursoContenidoTareaDto> {
		return this.http.post<CursoContenidoTareaDto>(
			`${this.contenidoUrl}/semana/${semanaId}/tarea`,
			request,
		);
	}

	actualizarTarea(
		tareaId: number,
		request: ActualizarTareaRequest,
	): Observable<CursoContenidoTareaDto> {
		return this.http.put<CursoContenidoTareaDto>(
			`${this.contenidoUrl}/tarea/${tareaId}`,
			request,
		);
	}

	eliminarTarea(tareaId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/tarea/${tareaId}`);
	}

	getArchivosEstudiantes(contenidoId: number): Observable<SemanaEstudianteArchivosDto[]> {
		return this.http.get<SemanaEstudianteArchivosDto[]>(
			`${this.contenidoUrl}/${contenidoId}/archivos-estudiantes`,
		);
	}

	registrarTareaArchivo(
		tareaId: number,
		request: RegistrarTareaArchivoRequest,
	): Observable<TareaArchivoDto> {
		return this.http.post<TareaArchivoDto>(
			`${this.contenidoUrl}/tarea/${tareaId}/archivo`,
			request,
		);
	}

	eliminarTareaArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.http.delete<{ mensaje: string }>(`${this.contenidoUrl}/tarea-archivo/${archivoId}`);
	}

	getArchivosTareaEstudiantes(tareaId: number): Observable<EstudianteTareaArchivosGroupDto[]> {
		return this.http.get<EstudianteTareaArchivosGroupDto[]>(
			`${this.contenidoUrl}/tarea/${tareaId}/archivos-estudiantes`,
		);
	}
	// #endregion

	// #region Calificaciones
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

	// #region Blob Storage
	uploadFile(file: File): Observable<{ url: string; fileName: string }> {
		const formData = FileUploadBuilder.create(file)
			.container('curso-contenido')
			.withTimestamp()
			.build();
		return this.http.post<{ url: string; fileName: string }>(`${this.blobUrl}/upload`, formData);
	}
	// #endregion
}
