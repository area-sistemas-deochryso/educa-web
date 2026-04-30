import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	DashboardCandidatoBlacklist,
	DashboardDominioReceptor,
	DashboardSenderStat,
	DashboardSerieTemporalPunto,
	DashboardTopDestinatario,
	SerieTemporalGranularidad,
} from '../models/email-monitoreo.models';

/**
 * Plan 39 Chat C — gateway HTTP a los 5 endpoints del Chat A (077) +
 * `defer-fail-status` del Plan 29 Chat 2.6.
 *
 * Interceptor global desempaqueta `ApiResponse<T>` → genérico T directo.
 * El SW cachea automáticamente los GET (regla `service-worker.md`, SWR).
 */
@Injectable({ providedIn: 'root' })
export class EmailMonitoreoApiService {
	private http = inject(HttpClient);
	private baseUrl = `${environment.apiUrl}/api/sistema/email-outbox/monitoreo`;

	getSenderStats(ventanaDias: number): Observable<DashboardSenderStat[]> {
		const params = new HttpParams().set('ventanaDias', ventanaDias);
		return this.http.get<DashboardSenderStat[]>(`${this.baseUrl}/sender-stats`, {
			params,
		});
	}

	getTopDestinatarios(
		ventanaDias: number,
		limit: number,
	): Observable<DashboardTopDestinatario[]> {
		const params = new HttpParams()
			.set('ventanaDias', ventanaDias)
			.set('limit', limit);
		return this.http.get<DashboardTopDestinatario[]>(
			`${this.baseUrl}/top-destinatarios`,
			{ params },
		);
	}

	getSerieTemporal(
		granularidad: SerieTemporalGranularidad,
	): Observable<DashboardSerieTemporalPunto[]> {
		const params = new HttpParams().set('granularidad', granularidad);
		return this.http.get<DashboardSerieTemporalPunto[]>(
			`${this.baseUrl}/serie-temporal`,
			{ params },
		);
	}

	getDominiosReceptores(
		ventanaDias: number,
	): Observable<DashboardDominioReceptor[]> {
		const params = new HttpParams().set('ventanaDias', ventanaDias);
		return this.http.get<DashboardDominioReceptor[]>(
			`${this.baseUrl}/dominios-receptores`,
			{ params },
		);
	}

	getCandidatosBlacklist(): Observable<DashboardCandidatoBlacklist[]> {
		// Defaults los inyecta el BE desde EmailSettings.MailboxFullThreshold*.
		return this.http.get<DashboardCandidatoBlacklist[]>(
			`${this.baseUrl}/candidatos-blacklist`,
		);
	}
}
