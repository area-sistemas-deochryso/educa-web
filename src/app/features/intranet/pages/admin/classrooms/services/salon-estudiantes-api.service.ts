import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@config/environment';

import {
	SalonEstudianteListDto,
	EstudianteDisponibleDto,
	TransferirEstudianteSalonDto,
	RetirarEstudianteSalonDto,
	AccionEstudianteSalonResponseDto,
} from '../models';

/**
 * Gestión de estudiantes de un salón en curso — agregar/transferir/retirar (brief 436).
 * Separado de ClassroomsAdminApiService: alimenta el store propio de la tab "Estudiantes".
 */
@Injectable({ providedIn: 'root' })
export class SalonEstudiantesApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/sistema/salones`;

	listarPorSalon(salonId: number): Observable<SalonEstudianteListDto[]> {
		return this.http
			.get<SalonEstudianteListDto[]>(`${this.baseUrl}/${salonId}/estudiantes`)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	buscarSinSalon(query: string): Observable<EstudianteDisponibleDto[]> {
		return this.http
			.get<EstudianteDisponibleDto[]>(`${this.baseUrl}/estudiantes/sin-salon?query=${encodeURIComponent(query)}`)
			.pipe(map((data) => (Array.isArray(data) ? data : [])));
	}

	agregar(salonId: number, estudianteId: number): Observable<boolean> {
		return this.http
			.post<unknown>(`${this.baseUrl}/${salonId}/estudiantes/${estudianteId}`, {})
			.pipe(map(() => true));
	}

	transferir(salonId: number, estudianteId: number, dto: TransferirEstudianteSalonDto): Observable<AccionEstudianteSalonResponseDto> {
		return this.http.post<AccionEstudianteSalonResponseDto>(
			`${this.baseUrl}/${salonId}/estudiantes/${estudianteId}/transferir`,
			dto,
		);
	}

	retirar(salonId: number, estudianteId: number, dto: RetirarEstudianteSalonDto): Observable<AccionEstudianteSalonResponseDto> {
		return this.http.post<AccionEstudianteSalonResponseDto>(
			`${this.baseUrl}/${salonId}/estudiantes/${estudianteId}/retirar`,
			dto,
		);
	}
}
