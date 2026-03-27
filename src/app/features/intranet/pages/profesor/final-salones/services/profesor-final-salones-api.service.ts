import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '@config/environment';
import { EstudianteAsistencia } from '@shared/services/asistencia';
import { HorarioResponseDto, SalonNotasResumenDto } from '@data/models';

import {
	SalonAdminListDto,
	AprobacionEstudianteListDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	BatchCommandResult,
	PeriodoAcademicoListDto,
	ConfiguracionCalificacionListDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ProfesorFinalSalonesApiService {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly baseUrl = environment.apiUrl;
	// #endregion

	// #region Salones del profesor
	getSalonesProfesor(anio: number): Observable<SalonAdminListDto[]> {
		return this.http
			.get<SalonAdminListDto[]>(
				`${this.baseUrl}/api/AprobacionEstudiante/salones-profesor?anio=${anio}`,
			)
			.pipe(
				map((data) => (Array.isArray(data) ? data : [])),
				catchError(() => of([])),
			);
	}
	// #endregion

	// #region Periodos y configuraciones
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

	aprobarEstudiante(dto: AprobarEstudianteDto): Observable<boolean> {
		return this.http
			.post<unknown>(`${this.baseUrl}/api/AprobacionEstudiante`, dto)
			.pipe(
				map(() => true),
				catchError(() => of(false)),
			);
	}

	aprobarMasivo(dto: AprobacionMasivaDto): Observable<BatchCommandResult | null> {
		return this.http
			.post<BatchCommandResult>(
				`${this.baseUrl}/api/AprobacionEstudiante/masivo`,
				dto,
			)
			.pipe(catchError(() => of(null)));
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

	// #region Asistencia mensual
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
