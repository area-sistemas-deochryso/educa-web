import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import {
	CrearEmailDomainPauseDto,
	EmailDomainPauseListaDto,
	LiberarEmailDomainPauseDto,
} from '@data/models/email-domain-pause.models';

/**
 * Plan 37 Chat 3 — gateway HTTP del dominio EmailRecipientDomainPause.
 *
 * Endpoints:
 *   - GET  /api/sistema/email-outbox/domain-pauses?activas=
 *   - POST /api/sistema/email-outbox/domain-pauses
 *   - POST /api/sistema/email-outbox/domain-pauses/{id}/release
 */
@Injectable({ providedIn: 'root' })
export class EmailDomainPauseService {
	private readonly http = inject(HttpClient);
	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-outbox/domain-pauses`;

	getActivas(activas = true): Observable<EmailDomainPauseListaDto[]> {
		const params = new HttpParams().set('activas', String(activas));
		return this.http.get<EmailDomainPauseListaDto[]>(this.apiBase, { params });
	}

	crear(request: CrearEmailDomainPauseDto): Observable<EmailDomainPauseListaDto> {
		return this.http.post<EmailDomainPauseListaDto>(this.apiBase, request);
	}

	liberar(
		id: number,
		request: LiberarEmailDomainPauseDto,
	): Observable<EmailDomainPauseListaDto> {
		return this.http.post<EmailDomainPauseListaDto>(
			`${this.apiBase}/${id}/release`,
			request,
		);
	}
}
