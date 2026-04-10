import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@config/environment';
import { HttpClient } from '@angular/common/http';
import { PaginatedResponse } from '@shared/models';
import {
	AsistenciaDiaConEstadisticas,
	EstadisticasDia,
	EstadoAsistencia,
	EstudianteAsistencia,
	GradoSeccion,
	HijoApoderado,
	ProfesorSede,
	ResumenAsistencia,
	SalonProfesor,
} from '@data/models/attendance.models';

import { StudentAttendanceApiService } from './student-attendance-api.service';
import { GuardianAttendanceApiService } from './guardian-attendance-api.service';
import { TeacherAttendanceApiService } from './teacher-attendance-api.service';
import { DirectorAttendanceApiService } from './director-attendance-api.service';

/**
 * Thin facade that delegates to role-specific API services.
 * Kept for backward compatibility — existing consumers can continue
 * injecting AttendanceService without changes.
 *
 * New code should inject the role-specific services directly:
 * - StudentAttendanceApiService
 * - GuardianAttendanceApiService
 * - TeacherAttendanceApiService
 * - DirectorAttendanceApiService
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	private readonly estudianteApi = inject(StudentAttendanceApiService);
	private readonly apoderadoApi = inject(GuardianAttendanceApiService);
	private readonly profesorApi = inject(TeacherAttendanceApiService);
	private readonly directorApi = inject(DirectorAttendanceApiService);

	// #region Estudiante

	getMisAsistencias(mes?: number, anio?: number): Observable<ResumenAsistencia | null> {
		return this.estudianteApi.getMisAsistencias(mes, anio);
	}

	// #endregion

	// #region Apoderado

	getHijos(): Observable<HijoApoderado[]> {
		return this.apoderadoApi.getHijos();
	}

	getAsistenciaHijo(
		estudianteId: number,
		mes?: number,
		anio?: number,
	): Observable<ResumenAsistencia | null> {
		return this.apoderadoApi.getAsistenciaHijo(estudianteId, mes, anio);
	}

	// #endregion

	// #region Profesor

	getSalonesProfesor(): Observable<SalonProfesor[]> {
		return this.profesorApi.getSalonesProfesor();
	}

	getSalonesProfesorPorHorario(): Observable<SalonProfesor[]> {
		return this.profesorApi.getSalonesProfesorPorHorario();
	}

	getAsistenciasGrado(
		grado: string,
		seccion: string,
		mes?: number,
		anio?: number,
	): Observable<EstudianteAsistencia[]> {
		return this.profesorApi.getAsistenciasGrado(grado, seccion, mes, anio);
	}

	getAsistenciaDia(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas> {
		return this.profesorApi.getAsistenciaDia(grado, seccion, fecha);
	}

	// #endregion

	// #region Director

	getReporteDirector(
		fecha?: Date,
		grado?: string,
		seccion?: string,
	): Observable<EstudianteAsistencia[]> {
		return this.directorApi.getReporteDirector(fecha, grado, seccion);
	}

	getEstadisticasDirector(fecha?: Date): Observable<EstadisticasDia | null> {
		return this.directorApi.getEstadisticasDirector(fecha);
	}

	getAsistenciaDiaDirector(
		grado: string,
		seccion: string,
		fecha: Date,
	): Observable<AsistenciaDiaConEstadisticas> {
		return this.directorApi.getAsistenciaDiaDirector(grado, seccion, fecha);
	}

	descargarPdfAsistenciaDia(grado: string, seccion: string, fecha?: Date): Observable<Blob> {
		return this.directorApi.descargarPdfAsistenciaDia(grado, seccion, fecha);
	}

	descargarPdfAsistenciaMes(
		grado: string,
		seccion: string,
		mes: number,
		anio: number,
	): Observable<Blob> {
		return this.directorApi.descargarPdfAsistenciaMes(grado, seccion, mes, anio);
	}

	descargarPdfAsistenciaPeriodo(
		grado: string,
		seccion: string,
		mesInicio: number,
		anioInicio: number,
		mesFin: number,
		anioFin: number,
	): Observable<Blob> {
		return this.directorApi.descargarPdfAsistenciaPeriodo(
			grado,
			seccion,
			mesInicio,
			anioInicio,
			mesFin,
			anioFin,
		);
	}

	descargarPdfTodosSalonesDia(fecha?: Date): Observable<Blob> {
		return this.directorApi.descargarPdfTodosSalonesDia(fecha);
	}

	descargarPdfTodosSalonesSemana(fechaInicio?: Date): Observable<Blob> {
		return this.directorApi.descargarPdfTodosSalonesSemana(fechaInicio);
	}

	descargarPdfTodosSalonesMes(mes?: number, anio?: number): Observable<Blob> {
		return this.directorApi.descargarPdfTodosSalonesMes(mes, anio);
	}

	descargarPdfTodosSalonesAnio(anio?: number): Observable<Blob> {
		return this.directorApi.descargarPdfTodosSalonesAnio(anio);
	}

	getSalonesDirector(): Observable<SalonProfesor[]> {
		return this.directorApi.getSalonesDirector();
	}

	getProfesoresDirector(): Observable<ProfesorSede[]> {
		return this.directorApi.getProfesoresDirector();
	}

	getAsistenciasGradoDirector(
		grado: string,
		seccion: string,
		mes?: number,
		anio?: number,
	): Observable<EstudianteAsistencia[]> {
		return this.directorApi.getAsistenciasGradoDirector(grado, seccion, mes, anio);
	}

	getAsistenciasGradoDirectorPaginated(
		grado: string,
		seccion: string,
		page: number,
		pageSize: number,
		mes?: number,
		anio?: number,
	): Observable<PaginatedResponse<EstudianteAsistencia>> {
		return this.directorApi.getAsistenciasGradoDirectorPaginated(
			grado,
			seccion,
			page,
			pageSize,
			mes,
			anio,
		);
	}

	getGradosSeccionesDisponibles(): Observable<GradoSeccion[]> {
		return this.directorApi.getGradosSeccionesDisponibles();
	}

	// #endregion

	// #region Justificaciones

	/**
	 * Justificar o quitar justificacion de asistencia de un estudiante.
	 * POST /api/ConsultaAsistencia/justificar
	 */
	justificarAsistencia(
		estudianteId: number,
		fecha: Date,
		observacion: string,
		quitar = false,
	): Observable<{ success: boolean; message: string }> {
		const body = {
			estudianteId,
			fecha: this.formatDateLocal(fecha),
			observacion,
			quitar,
		};

		return this.http
			.post<{ success: boolean; message: string }>(`${this.apiUrl}/justificar`, body)
			.pipe(
				catchError(() =>
					of({ success: false, message: 'Error al guardar la justificación' }),
				),
			);
	}

	// #endregion

	// #region Estados validos

	/**
	 * Obtener estados de asistencia validos para mostrar en leyenda
	 * GET /api/ConsultaAsistencia/estados-validos
	 */
	getEstadosValidos(): Observable<EstadoAsistencia[]> {
		return this.http
			.get<EstadoAsistencia[]>(`${this.apiUrl}/estados-validos`)
			.pipe(catchError(() => of([])));
	}

	// #endregion

	// #region Helpers privados

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// #endregion
}
