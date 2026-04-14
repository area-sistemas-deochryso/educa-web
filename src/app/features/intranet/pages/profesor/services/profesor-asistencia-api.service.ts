import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import {
	AsistenciaCursoFechaDto,
	RegistrarAsistenciaCursoDto,
	AsistenciaCursoResumenDto,
} from '../models';

/**
 * API client: asistencia por curso (profesor).
 *
 * NOTE: apiResponseInterceptor unwraps { success, data }; return types
 * reflect the unwrapped payload.
 */
@Injectable({ providedIn: 'root' })
export class ProfesorAsistenciaApiService {
	private readonly http = inject(HttpClient);
	private readonly asistenciaCursoUrl = `${environment.apiUrl}/api/AsistenciaCurso`;

	getAsistenciaCursoFecha(horarioId: number, fecha: string): Observable<AsistenciaCursoFechaDto> {
		return this.http.get<AsistenciaCursoFechaDto>(
			`${this.asistenciaCursoUrl}/horario/${horarioId}/fecha`,
			{ params: { fecha } },
		);
	}

	registrarAsistenciaCurso(
		horarioId: number,
		dto: RegistrarAsistenciaCursoDto,
	): Observable<void> {
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
}
