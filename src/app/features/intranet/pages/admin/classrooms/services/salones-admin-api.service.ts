import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@config/environment';
import { EstudianteAsistencia } from '@intranet-shared/services';
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
	BatchCommandResult,
	CrearSalonDto,
	SeccionSimpleDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ClassroomsAdminApiService {
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
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	crearSalon(dto: CrearSalonDto): Observable<boolean> {
		return this.http
			.post<unknown>(`${this.baseUrl}/api/sistema/salones/crear`, dto)
			.pipe(map(() => true));
	}
	// #endregion

	// #region Catálogos
	getSecciones(): Observable<SeccionSimpleDto[]> {
		return this.http
			.get<SeccionSimpleDto[]>(`${this.baseUrl}/api/sistema/secciones`)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}
	// #endregion

	// #region Configuración de Calificación
	getConfiguracionPorNivel(nivel: string, anio: number): Observable<ConfiguracionCalificacionListDto | null> {
		return this.http
			.get<ConfiguracionCalificacionListDto>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/nivel/${nivel}?anio=${anio}`,
			)
			.pipe(map((data) => (data && typeof data === 'object' && !('success' in data) ? data : null)));
	}

	getConfiguracionesPorAnio(anio: number): Observable<ConfiguracionCalificacionListDto[]> {
		return this.http
			.get<ConfiguracionCalificacionListDto[]>(
				`${this.baseUrl}/api/ConfiguracionCalificacion/anio/${anio}`,
			)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	crearConfiguracion(dto: CrearConfiguracionCalificacionDto): Observable<boolean> {
		return this.http
			.post<number>(`${this.baseUrl}/api/ConfiguracionCalificacion`, dto)
			.pipe(map(() => true));
	}

	actualizarConfiguracion(id: number, dto: ActualizarConfiguracionCalificacionDto): Observable<boolean> {
		return this.http
			.put<unknown>(`${this.baseUrl}/api/ConfiguracionCalificacion/${id}`, dto)
			.pipe(map(() => true));
	}
	// #endregion

	// #region Periodos Académicos
	getPeriodosPorAnio(anio: number): Observable<PeriodoAcademicoListDto[]> {
		return this.http
			.get<PeriodoAcademicoListDto[]>(
				`${this.baseUrl}/api/PeriodoAcademico/anio/${anio}`,
			)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	crearPeriodo(dto: CrearPeriodoAcademicoDto): Observable<boolean> {
		return this.http
			.post<number>(`${this.baseUrl}/api/PeriodoAcademico`, dto)
			.pipe(map(() => true));
	}

	cerrarPeriodo(id: number): Observable<CerrarPeriodoResultDto | null> {
		return this.http.put<CerrarPeriodoResultDto>(
			`${this.baseUrl}/api/PeriodoAcademico/${id}/cerrar`,
			{},
		);
	}
	// #endregion

	// #region Aprobaciones
	getEstudiantesPorSalon(salonId: number): Observable<AprobacionEstudianteListDto[]> {
		return this.http
			.get<AprobacionEstudianteListDto[]>(
				`${this.baseUrl}/api/AprobacionEstudiante/salon/${salonId}/estudiantes`,
			)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	getAprobacionesPorSalon(salonId: number, periodoId: number): Observable<AprobacionEstudianteListDto[]> {
		return this.http
			.get<AprobacionEstudianteListDto[]>(
				`${this.baseUrl}/api/AprobacionEstudiante/salon/${salonId}?periodoId=${periodoId}`,
			)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	aprobarEstudiante(dto: AprobarEstudianteDto): Observable<boolean> {
		return this.http
			.post<unknown>(`${this.baseUrl}/api/AprobacionEstudiante`, dto)
			.pipe(map(() => true));
	}

	aprobarMasivo(dto: AprobacionMasivaDto): Observable<BatchCommandResult | null> {
		return this.http.post<BatchCommandResult>(
			`${this.baseUrl}/api/AprobacionEstudiante/masivo`,
			dto,
		);
	}
	// #endregion

	// #region Horarios del salón
	getHorariosPorSalon(salonId: number): Observable<HorarioResponseDto[]> {
		return this.http
			.get<HorarioResponseDto[]>(`${this.baseUrl}/api/horario/salon/${salonId}`)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
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
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}
	// #endregion

	// #region Notas por salón + curso
	getNotasSalon(salonId: number, cursoId: number): Observable<SalonNotasResumenDto | null> {
		return this.http
			.get<SalonNotasResumenDto>(
				`${this.baseUrl}/api/calificacion/salon/${salonId}/curso/${cursoId}`,
			)
			.pipe(map((data) => (data && typeof data === 'object' && !('success' in data) ? data : null)));
	}
	// #endregion
}
