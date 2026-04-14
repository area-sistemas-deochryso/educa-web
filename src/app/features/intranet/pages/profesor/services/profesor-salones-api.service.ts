import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@config/environment';
import {
	HorarioProfesorDto,
	SalonTutoriaDto,
	ProfesorMisSalonesConEstudiantesDto,
	ProfesorSalonConEstudiantesDto,
} from '../models';

/**
 * API client: horarios, salones del profesor, boletas y server time.
 *
 * NOTE: apiResponseInterceptor unwraps { success, data }; return types
 * reflect the unwrapped payload.
 */
@Injectable({ providedIn: 'root' })
export class ProfesorSalonesApiService {
	private readonly http = inject(HttpClient);
	private readonly horarioUrl = `${environment.apiUrl}/api/Horario`;
	private readonly profesorSalonUrl = `${environment.apiUrl}/api/ProfesorSalon`;
	private readonly profesorUrl = `${environment.apiUrl}/api/Profesor`;
	private readonly boletaUrl = `${environment.apiUrl}/api/BoletaNotas`;

	// #region Horarios
	getHorarios(profesorId: number): Observable<HorarioProfesorDto[]> {
		return this.http
			.get<HorarioProfesorDto[]>(`${this.horarioUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of([])));
	}
	// #endregion

	// #region Salones
	getSalonTutoria(profesorId: number): Observable<SalonTutoriaDto | null> {
		return this.http
			.get<SalonTutoriaDto>(`${this.profesorSalonUrl}/profesor/${profesorId}`)
			.pipe(catchError(() => of(null)));
	}

	getMisEstudiantes(): Observable<ProfesorMisSalonesConEstudiantesDto> {
		return this.http
			.get<ProfesorMisSalonesConEstudiantesDto>(`${this.profesorUrl}/mis-estudiantes`)
			.pipe(catchError(() => of({ salones: [], totalEstudiantes: 0, totalSalones: 0 })));
	}

	getEstudiantesSalon(salonId: number): Observable<ProfesorSalonConEstudiantesDto | null> {
		return this.http
			.get<ProfesorSalonConEstudiantesDto>(`${this.profesorUrl}/estudiantes-salon/${salonId}`)
			.pipe(catchError(() => of(null)));
	}
	// #endregion

	// #region Boletas PDF
	descargarBoletaEstudiante(estudianteId: number, salonId: number): Observable<Blob> {
		return this.http.get(`${this.boletaUrl}/estudiante/${estudianteId}`, {
			params: { salonId: salonId.toString() },
			responseType: 'blob',
		});
	}

	descargarBoletaSalon(salonId: number): Observable<Blob> {
		return this.http.get(`${this.boletaUrl}/salon/${salonId}`, {
			responseType: 'blob',
		});
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
}
