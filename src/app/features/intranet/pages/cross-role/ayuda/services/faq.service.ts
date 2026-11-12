import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import { FaqDto, FaqMotivo, FaqVotoDto } from '../models/faq.models';

/** Las llamadas secundarias (voto, apertura, ranking) no deben mostrar toast si fallan. */
const SILENT = { headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }) };

/**
 * Gateway de los endpoints de FAQ visibles del panel de ayuda.
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

	/** Mismas FAQ visibles, con las más abiertas primero. Solo alimenta «Más consultadas». */
	getFaqsMasConsultadas(): Observable<FaqDto[]> {
		return this.http.get<FaqDto[]>(this.apiUrl, { params: { orden: 'consultas' }, ...SILENT });
	}

	/** Voto vigente de la persona (un voto por pregunta; votar de nuevo lo reemplaza). */
	votar(faqId: number, util: boolean, motivo: FaqMotivo | null): Observable<FaqVotoDto> {
		const body = util || !motivo ? { util } : { util, motivo };
		return this.http.put<FaqVotoDto>(`${this.apiUrl}/${faqId}/feedback`, body, SILENT);
	}

	misVotos(): Observable<FaqVotoDto[]> {
		return this.http.get<FaqVotoDto[]>(`${this.apiUrl}/feedback/mios`, SILENT);
	}

	/** Cuenta una apertura (contador agregado, sin usuario). Responde 204. */
	registrarApertura(faqId: number): Observable<void> {
		return this.http.post<void>(`${this.apiUrl}/${faqId}/apertura`, null, SILENT);
	}
}
