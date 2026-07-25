import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import {
	ActualizarFaqRequest,
	CrearFaqRequest,
	FaqAdminDto,
} from '../models/faq-admin.models';

/**
 * Gateway del CRUD admin de FAQ + wizard (`AYUDA_MANAGE`).
 * `apiResponseInterceptor` ya desenvuelve `ApiResponse<T>` — los métodos
 * devuelven el payload directo.
 */
@Injectable({ providedIn: 'root' })
export class FaqAdminService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/admin/faq`;

	getAll(): Observable<FaqAdminDto[]> {
		return this.http.get<FaqAdminDto[]>(this.apiUrl);
	}

	getById(id: number): Observable<FaqAdminDto> {
		return this.http.get<FaqAdminDto>(`${this.apiUrl}/${id}`);
	}

	crear(request: CrearFaqRequest): Observable<FaqAdminDto> {
		return this.http.post<FaqAdminDto>(this.apiUrl, request);
	}

	actualizar(id: number, request: ActualizarFaqRequest): Observable<FaqAdminDto> {
		return this.http.put<FaqAdminDto>(`${this.apiUrl}/${id}`, request);
	}

	eliminar(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
