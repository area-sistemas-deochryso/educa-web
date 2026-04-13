import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
	HealthPermissionSummaryDto,
	StudentForHealthDto,
	SymptomDto,
	HealthExitPermissionDto,
	HealthJustificationDto,
	CreateHealthExitRequest,
	ValidateDatesRequest,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';

@Injectable({ providedIn: 'root' })
export class HealthPermissionsApiService {
	private http = inject(HttpClient);
	private readonly API = '/api/permisos-salud';

	// #region Consultas

	getSintomas(): Observable<SymptomDto[]> {
		return this.http.get<SymptomDto[]>(`${this.API}/sintomas`);
	}

	getResumen(salonId: number): Observable<HealthPermissionSummaryDto> {
		return this.http.get<HealthPermissionSummaryDto>(`${this.API}/resumen`, {
			params: { salonId },
		});
	}

	getEstudiantes(salonId: number): Observable<StudentForHealthDto[]> {
		return this.http.get<StudentForHealthDto[]>(`${this.API}/estudiantes`, {
			params: { salonId },
		});
	}

	validarFechas(dto: ValidateDatesRequest): Observable<DateValidationResult[]> {
		return this.http.post<DateValidationResult[]>(`${this.API}/validar-fechas`, dto);
	}

	// #endregion

	// #region Permiso de salida

	crearPermisoSalida(dto: CreateHealthExitRequest): Observable<HealthExitPermissionDto> {
		return this.http.post<HealthExitPermissionDto>(`${this.API}/salida`, dto);
	}

	anularPermisoSalida(id: number): Observable<void> {
		return this.http.delete<void>(`${this.API}/salida/${id}`);
	}

	// #endregion

	// #region Justificacion medica

	crearJustificacion(formData: FormData): Observable<HealthJustificationDto> {
		return this.http.post<HealthJustificationDto>(`${this.API}/justificacion`, formData);
	}

	anularJustificacion(id: number): Observable<void> {
		return this.http.delete<void>(`${this.API}/justificacion/${id}`);
	}

	// #endregion

	// #region Admin

	getSalones(): Observable<{ id: number; descripcion: string; cantidadEstudiantes: number }[]> {
		return this.http.get<{ id: number; descripcion: string; cantidadEstudiantes: number }[]>(
			`${this.API}/salones`,
		);
	}

	// #endregion
}
