// #region Imports
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ContactoRequest } from './contact.model';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class ContactApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/Contacto`;

	async enviar(payload: ContactoRequest): Promise<void> {
		await firstValueFrom(this.http.post<void>(this.baseUrl, payload));
	}
}
// #endregion
