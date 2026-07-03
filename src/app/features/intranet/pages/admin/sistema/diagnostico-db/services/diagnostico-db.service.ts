import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';

import {
	ActiveBlockingSessionDto,
	DatabaseFileStatsDto,
	IdentityValueDto,
	IndexFragmentationDto,
	MissingIndexDto,
	ResourceStatsSnapshotDto,
	TableSizeDto,
	TopQueryDto,
	UnusedIndexDto,
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

	getMissingIndexes(): Observable<MissingIndexDto[]> {
		return this.http.get<MissingIndexDto[]>(`${this.baseUrl}/missing-indexes`);
	}

	getIndexFragmentation(): Observable<IndexFragmentationDto[]> {
		return this.http.get<IndexFragmentationDto[]>(`${this.baseUrl}/index-fragmentation`);
	}

	getUnusedIndexes(): Observable<UnusedIndexDto[]> {
		return this.http.get<UnusedIndexDto[]>(`${this.baseUrl}/unused-indexes`);
	}

	getIdentityValues(): Observable<IdentityValueDto[]> {
		return this.http.get<IdentityValueDto[]>(`${this.baseUrl}/identity-values`);
	}
	// #endregion
}
