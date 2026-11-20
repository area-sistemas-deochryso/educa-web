import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { MailerSendEmailsFilter, MailerSendEmailsPage } from './mailersend-activity.models';

/** Gateway al proxy BE de MailerSend `GET /v1/emails` (solo lectura). */
@Injectable({ providedIn: 'root' })
export class MailerSendActivityService {
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/mailersend/emails`;

	list(filter: MailerSendEmailsFilter): Observable<MailerSendEmailsPage> {
		let params = new HttpParams()
			.set('desde', filter.desde.toISOString())
			.set('hasta', filter.hasta.toISOString())
			.set('page', filter.page)
			.set('limit', filter.limit);

		if (filter.estados.length) params = params.set('estados', filter.estados.join(','));
		const destinatario = filter.destinatario.trim();
		if (destinatario) params = params.set('destinatario', destinatario);

		return this.http.get<MailerSendEmailsPage>(this.baseUrl, { params });
	}
}
