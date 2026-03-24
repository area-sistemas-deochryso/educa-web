import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '@config/environment';
import { EstudianteAsistencia } from '@shared/services/asistencia';
import { HorarioResponseDto, SalonNotasResumenDto } from '@data/models';

import {
	SalonAdminListDto,
	ConfiguracionCalificacionListDto,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	PeriodoAcademicoListDto,
	CrearPeriodoAcademicoDto,
	CerrarPeriodoResultDto,
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	AprobacionMasivaResultDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SalonesAdminApiService {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly baseUrl = environment.apiUrl;
	// #endregion

	// #region Salones Admin
	getSalonesAdmin(anio: number, esVerano: boolean, nivel?: string): Observable<SalonAdminListDto[]> {
		let url = `${this.baseUrl}/api/AprobacionEstudiante/salones-admin?anio=${anio}&esVerano=${esVerano}`;
		if (nivel) url += `&nivel=${nivel}`;
		return this.http
			.get<SalonAdminListDto[]>(url)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}
	// #endregion

	// #region Configuración de Calificación
	getConfiguracionPorNivel(nivel: string, anio: number): Observable<ConfiguracionCalificacionListDto | null> {
		return this.http
			.get<ConfiguracionCalificacionListDto>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/nivel/${nivel}?anio=${anio}`,
			)
			.pipe(
				map((data) => (data && typeof data === 'object' && !('success' in data) ? data : null)),
				catchError(() => of(null)),
			);
	}

	getConfiguracionesPorAnio(anio: number): Observable<ConfiguracionCalificacionListDto[]> {
		return this.http
			.get<ConfiguracionCalificacionListDto[]>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/anio/${anio}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}

	crearConfiguracion(dto: CrearConfiguracionCalificacionDto): Observable<boolean> {
		return this.http
			.post<number>(`${this.baseUrl}/api/ConfiguracionCalificacion`, dto)
			.pipe(
				map(() => true),
				catchError(() => of(false)),
			);
	}

	actualizarConfiguracion(id: number, dto: ActualizarConfiguracionCalificacionDto): Observable<boolean> {
		return this.http
			.put<unknown>(`${this.baseUrl}/api/ConfiguracionCalificacion/${id}`, dto)
			.pipe(
				map(() => true),
				catchError(() => of(false)),
			);
	}
	// #endregion

	// #region Periodos Académicos
	getPeriodosPorAnio(anio: number): Observable<PeriodoAcademicoListDto[]> {
		return this.http
			.get<PeriodoAcademicoListDto[]>(
				`${this.baseUrl}/api/PeriodoAcademico/anio/${anio}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}

	crearPeriodo(dto: CrearPeriodoAcademicoDto): Observable<boolean> {
		return this.http
			.post<number>(`${this.baseUrl}/api/PeriodoAcademico`, dto)
			.pipe(
				map(() => true),
				catchError(() => of(false)),
			);
	}

	cerrarPeriodo(id: number): Observable<CerrarPeriodoResultDto | null> {
		return this.http
			.put<CerrarPeriodoResultDto>(
				`${this.baseUrl}/api/PeriodoAcademico/${id}/cerrar`,
				{},
			)
			.pipe(
				catchError(() => of(null)),
			);
	}
	// #endregion

	// #region Aprobaciones
	getEstudiantesPorSalon(salonId: number): Observable<AprobacionEstudianteListDto[]> {
		return this.http
			.get<AprobacionEstudianteListDto[]>(
				`${this.baseUrl}/api/AprobacionEstudiante/salon/${salonId}/estudiantes`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}

	getAprobacionesPorSalon(salonId: number, periodoId: number): Observable<AprobacionEstudianteListDto[]> {
		return this.http
			.get<AprobacionEstudianteListDto[]>(
				`${this.baseUrl}/api/AprobacionEstudiante/salon/${salonId}?periodoId=${periodoId}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}

	aprobarEstudiante(dto: AprobarEstudianteDto): Observable<boolean> {
		return this.http
			.post<unknown>(`${this.baseUrl}/api/AprobacionEstudiante`, dto)
			.pipe(
				map(() => true),
				catchError(() => of(false)),
			);
	}

	aprobarMasivo(dto: AprobacionMasivaDto): Observable<AprobacionMasivaResultDto | null> {
		return this.http
			.post<AprobacionMasivaResultDto>(
				`${this.baseUrl}/api/AprobacionEstudiante/masivo`,
				dto,
			)
			.pipe(
				catchError(() => of(null)),
			);
	}
	// #endregion

	// #region Horarios del salón
	getHorariosPorSalon(salonId: number): Observable<HorarioResponseDto[]> {
		return this.http
			.get<HorarioResponseDto[]>(`${this.baseUrl}/api/horario/salon/${salonId}`)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}
	// #endregion

	// #region Asistencia mensual (director)
	getAsistenciaMensual(
		grado: string,
		seccion: string,
		mes: number,
		anio: number,
	): Observable<EstudianteAsistencia[]> {
		return this.http
			.get<EstudianteAsistencia[]>(
				`${this.baseUrl}/api/consultaasistencia/director/grado?grado=${encodeURIComponent(grado)}&seccion=${seccion}&mes=${mes}&anio=${anio}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}
	// #endregion

	// #region Notas por salón + curso
	getNotasSalon(salonId: number, cursoId: number): Observable<SalonNotasResumenDto | null> {
		return this.http
			.get<SalonNotasResumenDto>(
				`${this.baseUrl}/api/calificacion/salon/${salonId}/curso/${cursoId}`,
			)
			.pipe(
				map((data) => (data && typeof data === 'object' && !('success' in data) ? data : null)),
				catchError(() => of(null)),
			);
	}
	// #endregion
}
