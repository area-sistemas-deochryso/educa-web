import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { FaqDto } from '../models/faq.models';

/**
 * Gateway del endpoint de FAQ visibles del panel de ayuda.
 * El filtrado por capability del usuario ya lo resuelve el BE — este service
 * solo pasa los filtros opcionales de categoría y texto libre.
 */
@Injectable({ providedIn: 'root' })
export class FaqService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/faq`;

	getFaqs(categoria?: string | null, q?: string | null): Observable<FaqDto[]> {
		const params: Record<string, string> = {};
		if (categoria) params['categoria'] = categoria;
		if (q) params['q'] = q;

		return this.http.get<FaqDto[]>(this.apiUrl, { params });
	}
}
