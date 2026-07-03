import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	ActiveBlockingSessionDto,
	DatabaseFileStatsDto,
	ResourceStatsSnapshotDto,
	TableSizeDto,
	TopQueryDto,
} from '../models/diagnostico-db.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticoDbService {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/sistema/db-diagnostics`;
	// #endregion

	// #region Consultas (GET)
	// * Interceptor global desempaqueta ApiResponse<T> → el tipo es T directo.
	getResourceStats(lastMinutes = 60): Observable<ResourceStatsSnapshotDto[]> {
		const params = new HttpParams().set('lastMinutes', lastMinutes);
		return this.http.get<ResourceStatsSnapshotDto[]>(`${this.baseUrl}/resource-stats`, { params });
	}

	getTopQueries(top = 10): Observable<TopQueryDto[]> {
		const params = new HttpParams().set('top', top);
		return this.http.get<TopQueryDto[]>(`${this.baseUrl}/top-queries`, { params });
	}

	getActiveBlocking(): Observable<ActiveBlockingSessionDto[]> {
		return this.http.get<ActiveBlockingSessionDto[]>(`${this.baseUrl}/active-blocking`);
	}

	getStorage(): Observable<DatabaseFileStatsDto[]> {
		return this.http.get<DatabaseFileStatsDto[]>(`${this.baseUrl}/storage`);
	}

	getTableSizes(): Observable<TableSizeDto[]> {
		return this.http.get<TableSizeDto[]>(`${this.baseUrl}/table-sizes`);
	}
	// #endregion
}
