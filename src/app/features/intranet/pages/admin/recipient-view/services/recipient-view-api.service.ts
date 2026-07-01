import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { RecipientSummary } from '@data/models';

@Injectable({ providedIn: 'root' })
export class RecipientViewApiService {
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/email-monitoreo`;

	getSummary(correo: string): Observable<RecipientSummary> {
		return this.http.get<RecipientSummary>(`${this.baseUrl}/recipient/${encodeURIComponent(correo)}`);
	}
}
