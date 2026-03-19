import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import {
	CampusPisoDto,
	CampusNodoDto,
	CampusAristaDto,
	CampusBloqueoDto,
	CampusCompletoDto,
	CampusPisoCompletoDto,
	CampusConexionVerticalDto,
	CrearPisoDto,
	ActualizarPisoDto,
	CrearNodoDto,
	ActualizarNodoDto,
	CrearAristaDto,
	ActualizarAristaDto,
	CrearBloqueoDto,
	ActualizarBloqueoDto,
	CrearConexionVerticalDto,
	ActualizarConexionVerticalDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CampusAdminApiService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/campus`;

	// #region Vista completa

	getCampusCompleto(): Observable<CampusCompletoDto> {
		return this.http.get<CampusCompletoDto>(`${this.apiUrl}/completo`);
	}

	getPisoCompleto(pisoId: number): Observable<CampusPisoCompletoDto> {
		return this.http.get<CampusPisoCompletoDto>(`${this.apiUrl}/pisos/${pisoId}/completo`);
	}

	// #endregion

	// #region Pisos

	listarPisos(): Observable<CampusPisoDto[]> {
		return this.http.get<CampusPisoDto[]>(`${this.apiUrl}/pisos`);
	}

	crearPiso(dto: CrearPisoDto): Observable<CampusPisoDto> {
		return this.http.post<CampusPisoDto>(`${this.apiUrl}/pisos`, dto);
	}

	actualizarPiso(id: number, dto: ActualizarPisoDto): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/pisos/${id}`, dto);
	}

	toggleEstadoPiso(id: number): Observable<void> {
		return this.http.patch<void>(`${this.apiUrl}/pisos/${id}/estado`, {});
	}

	// #endregion

	// #region Nodos

	crearNodo(dto: CrearNodoDto): Observable<CampusNodoDto> {
		return this.http.post<CampusNodoDto>(`${this.apiUrl}/nodos`, dto);
	}

	actualizarNodo(id: number, dto: ActualizarNodoDto): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/nodos/${id}`, dto);
	}

	eliminarNodo(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/nodos/${id}`);
	}

	// #endregion

	// #region Aristas

	crearArista(dto: CrearAristaDto): Observable<CampusAristaDto> {
		return this.http.post<CampusAristaDto>(`${this.apiUrl}/aristas`, dto);
	}

	actualizarArista(id: number, dto: ActualizarAristaDto): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/aristas/${id}`, dto);
	}

	eliminarArista(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/aristas/${id}`);
	}

	// #endregion

	// #region Bloqueos

	crearBloqueo(dto: CrearBloqueoDto): Observable<CampusBloqueoDto> {
		return this.http.post<CampusBloqueoDto>(`${this.apiUrl}/bloqueos`, dto);
	}

	actualizarBloqueo(id: number, dto: ActualizarBloqueoDto): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/bloqueos/${id}`, dto);
	}

	eliminarBloqueo(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/bloqueos/${id}`);
	}

	// #endregion

	// #region Conexiones Verticales

	listarConexionesVerticales(): Observable<CampusConexionVerticalDto[]> {
		return this.http.get<CampusConexionVerticalDto[]>(`${this.apiUrl}/conexiones-verticales`);
	}

	crearConexionVertical(dto: CrearConexionVerticalDto): Observable<CampusConexionVerticalDto> {
		return this.http.post<CampusConexionVerticalDto>(`${this.apiUrl}/conexiones-verticales`, dto);
	}

	actualizarConexionVertical(id: number, dto: ActualizarConexionVerticalDto): Observable<void> {
		return this.http.put<void>(`${this.apiUrl}/conexiones-verticales/${id}`, dto);
	}

	eliminarConexionVertical(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/conexiones-verticales/${id}`);
	}

	// #endregion
}
