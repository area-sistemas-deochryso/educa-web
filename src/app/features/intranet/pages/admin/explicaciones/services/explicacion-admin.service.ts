import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import {
	ActualizarExplicacionRequest,
	CrearExplicacionRequest,
	ExplicacionAdminDto,
} from '../models/explicacion-admin.models';

/**
 * Gateway del CRUD admin de explicaciones del modo informativo (`EXPLICACIONES_MANAGE`).
 * `apiResponseInterceptor` ya desenvuelve `ApiResponse<T>` — los métodos
 * devuelven el payload directo.
 */
@Injectable({ providedIn: 'root' })
export class ExplicacionAdminService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/admin/explicaciones`;

	getAll(): Observable<ExplicacionAdminDto[]> {
		return this.http.get<ExplicacionAdminDto[]>(this.apiUrl);
	}

	getById(id: number): Observable<ExplicacionAdminDto> {
		return this.http.get<ExplicacionAdminDto>(`${this.apiUrl}/${id}`);
	}

	crear(request: CrearExplicacionRequest): Observable<ExplicacionAdminDto> {
		return this.http.post<ExplicacionAdminDto>(this.apiUrl, request);
	}

	actualizar(id: number, request: ActualizarExplicacionRequest): Observable<ExplicacionAdminDto> {
		return this.http.put<ExplicacionAdminDto>(`${this.apiUrl}/${id}`, request);
	}

	eliminar(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
