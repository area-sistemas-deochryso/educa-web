/**
 * Aggregate facade. ProfesorApiService delega en 3 sub-services domain-specific
 * (ProfesorSalonesApiService, ProfesorCursosApiService, ProfesorAsistenciaApiService)
 * para respetar la regla max-lines:300 sin romper los 14 consumidores existentes.
 * Cada sub-service tiene su dominio (horarios+salones+boletas / contenido+
 * calificaciones+grupos / asistencia). Si nuevos consumidores: preferir inyectar
 * el sub-service correspondiente directamente.
 */
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
import { ProfesorSalonesApiService } from './profesor-salones-api.service';
import { ProfesorCursosApiService } from './profesor-cursos-api.service';
import { ProfesorAsistenciaApiService } from './profesor-asistencia-api.service';

@Injectable({ providedIn: 'root' })
export class ProfesorApiService {
	private readonly salones = inject(ProfesorSalonesApiService);
	private readonly cursos = inject(ProfesorCursosApiService);
	private readonly asistencia = inject(ProfesorAsistenciaApiService);

	// #region Horarios + Salones + Boletas + ServerTime
	getHorarios(profesorId: number): Observable<HorarioProfesorDto[]> {
		return this.salones.getHorarios(profesorId);
	}
	getSalonTutoria(profesorId: number): Observable<SalonTutoriaDto | null> {
		return this.salones.getSalonTutoria(profesorId);
	}
	getMisEstudiantes(): Observable<ProfesorMisSalonesConEstudiantesDto> {
		return this.salones.getMisEstudiantes();
	}
	getEstudiantesSalon(salonId: number): Observable<ProfesorSalonConEstudiantesDto | null> {
		return this.salones.getEstudiantesSalon(salonId);
	}
	descargarBoletaEstudiante(estudianteId: number, salonId: number): Observable<Blob> {
		return this.salones.descargarBoletaEstudiante(estudianteId, salonId);
	}
	descargarBoletaSalon(salonId: number): Observable<Blob> {
		return this.salones.descargarBoletaSalon(salonId);
	}
	getServerTime(): Observable<string | null> {
		return this.salones.getServerTime();
	}
	// #endregion

	// #region Curso Contenido
	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.cursos.getContenido(horarioId);
	}
	crearContenido(request: CrearCursoContenidoRequest): Observable<CursoContenidoDetalleDto> {
		return this.cursos.crearContenido(request);
	}
	eliminarContenido(id: number): Observable<{ mensaje: string }> {
		return this.cursos.eliminarContenido(id);
	}
	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): Observable<CursoContenidoSemanaDto> {
		return this.cursos.actualizarSemana(semanaId, request);
	}
	registrarArchivo(semanaId: number, request: RegistrarArchivoRequest): Observable<CursoContenidoArchivoDto> {
		return this.cursos.registrarArchivo(semanaId, request);
	}
	eliminarArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.cursos.eliminarArchivo(archivoId);
	}
	crearTarea(semanaId: number, request: CrearTareaRequest): Observable<CursoContenidoTareaDto> {
		return this.cursos.crearTarea(semanaId, request);
	}
	actualizarTarea(tareaId: number, request: ActualizarTareaRequest): Observable<CursoContenidoTareaDto> {
		return this.cursos.actualizarTarea(tareaId, request);
	}
	eliminarTarea(tareaId: number): Observable<{ mensaje: string }> {
		return this.cursos.eliminarTarea(tareaId);
	}
	getArchivosEstudiantes(contenidoId: number): Observable<SemanaEstudianteArchivosDto[]> {
		return this.cursos.getArchivosEstudiantes(contenidoId);
	}
	registrarTareaArchivo(tareaId: number, request: RegistrarTareaArchivoRequest): Observable<TareaArchivoDto> {
		return this.cursos.registrarTareaArchivo(tareaId, request);
	}
	eliminarTareaArchivo(archivoId: number): Observable<{ mensaje: string }> {
		return this.cursos.eliminarTareaArchivo(archivoId);
	}
	getArchivosTareaEstudiantes(tareaId: number): Observable<EstudianteTareaArchivosGroupDto[]> {
		return this.cursos.getArchivosTareaEstudiantes(tareaId);
	}
	// #endregion

	// #region Calificaciones
	getCalificaciones(contenidoId: number): Observable<CalificacionConNotasDto[]> {
		return this.cursos.getCalificaciones(contenidoId);
	}
	crearCalificacion(dto: CrearCalificacionDto): Observable<CalificacionConNotasDto> {
		return this.cursos.crearCalificacion(dto);
	}
	calificarLote(calificacionId: number, dto: CalificarLoteDto): Observable<void> {
		return this.cursos.calificarLote(calificacionId, dto);
	}
	actualizarNota(notaId: number, dto: ActualizarNotaDto): Observable<void> {
		return this.cursos.actualizarNota(notaId, dto);
	}
	eliminarCalificacion(calificacionId: number): Observable<void> {
		return this.cursos.eliminarCalificacion(calificacionId);
	}
	eliminarNotaEstudiante(calificacionId: number, estudianteId: number): Observable<void> {
		return this.cursos.eliminarNotaEstudiante(calificacionId, estudianteId);
	}
	cambiarTipoCalificacion(calificacionId: number, dto: CambiarTipoCalificacionDto): Observable<CalificacionConNotasDto> {
		return this.cursos.cambiarTipoCalificacion(calificacionId, dto);
	}
	getPeriodos(contenidoId: number): Observable<PeriodoCalificacionDto[]> {
		return this.cursos.getPeriodos(contenidoId);
	}
	crearPeriodo(dto: CrearPeriodoDto): Observable<PeriodoCalificacionDto> {
		return this.cursos.crearPeriodo(dto);
	}
	eliminarPeriodo(periodoId: number): Observable<void> {
		return this.cursos.eliminarPeriodo(periodoId);
	}
	getNotasSalon(salonId: number, cursoId: number): Observable<SalonNotasResumenDto> {
		return this.cursos.getNotasSalon(salonId, cursoId);
	}
	// #endregion

	// #region Grupos
	getGrupos(contenidoId: number): Observable<GruposResumenDto> {
		return this.cursos.getGrupos(contenidoId);
	}
	crearGrupo(dto: CrearGrupoDto): Observable<GrupoContenidoDto> {
		return this.cursos.crearGrupo(dto);
	}
	actualizarGrupo(grupoId: number, dto: ActualizarGrupoDto): Observable<void> {
		return this.cursos.actualizarGrupo(grupoId, dto);
	}
	eliminarGrupo(grupoId: number): Observable<void> {
		return this.cursos.eliminarGrupo(grupoId);
	}
	asignarEstudiantes(grupoId: number, dto: AsignarEstudiantesGrupoDto): Observable<void> {
		return this.cursos.asignarEstudiantes(grupoId, dto);
	}
	removerEstudianteDeGrupo(grupoId: number, estudianteId: number): Observable<void> {
		return this.cursos.removerEstudianteDeGrupo(grupoId, estudianteId);
	}
	configurarMaxEstudiantes(contenidoId: number, dto: ConfigurarMaxEstudiantesDto): Observable<void> {
		return this.cursos.configurarMaxEstudiantes(contenidoId, dto);
	}
	calificarGruposLote(calificacionId: number, dto: CalificarGruposLoteDto): Observable<void> {
		return this.cursos.calificarGruposLote(calificacionId, dto);
	}
	// #endregion

	// #region Asistencia Curso + Blob upload
	getAsistenciaCursoFecha(horarioId: number, fecha: string): Observable<AsistenciaCursoFechaDto> {
		return this.asistencia.getAsistenciaCursoFecha(horarioId, fecha);
	}
	registrarAsistenciaCurso(horarioId: number, dto: RegistrarAsistenciaCursoDto): Observable<void> {
		return this.asistencia.registrarAsistenciaCurso(horarioId, dto);
	}
	getAsistenciaCursoResumen(horarioId: number, fechaInicio: string, fechaFin: string): Observable<AsistenciaCursoResumenDto> {
		return this.asistencia.getAsistenciaCursoResumen(horarioId, fechaInicio, fechaFin);
	}
	uploadFile(file: File): Observable<{ url: string; fileName: string }> {
		return this.cursos.uploadFile(file);
	}
	// #endregion
}
