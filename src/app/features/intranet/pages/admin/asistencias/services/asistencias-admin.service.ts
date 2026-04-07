// #region Imports
import {
	ActualizarHorasRequest,
	AsistenciaAdminEstadisticas,
	AsistenciaAdminLista,
	CierreMensualLista,
	CrearAsistenciaCompletaRequest,
	CrearCierreMensualRequest,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	EnviarCorreosAsistenciaRequest,
	EnviarCorreosResultado,
	EstudianteParaSeleccion,
	RevertirCierreMensualRequest,
} from '../models';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { ApiResponse } from '@shared/models';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

// #endregion

@Injectable({ providedIn: 'root' })
export class AsistenciasAdminService {
	// #region Dependencias
	private readonly apiUrl = `${environment.apiUrl}/api/asistencia-admin`;
	private readonly cierreUrl = `${environment.apiUrl}/api/cierre-asistencia`;
	private http = inject(HttpClient);
	// #endregion

	// #region Consultas (GET) — interceptor unwraps ApiResponse<T> automatically

	listarDelDia(fecha: string, sedeId?: number, search?: string): Observable<AsistenciaAdminLista[]> {
		const params: Record<string, string> = { fecha };
		if (sedeId) params['sedeId'] = sedeId.toString();
		if (search) params['search'] = search;

		return this.http
			.get<AsistenciaAdminLista[]>(`${this.apiUrl}/dia`, { params })
			.pipe(catchError(() => of([])));
	}

	obtenerEstadisticas(fecha: string, sedeId?: number): Observable<AsistenciaAdminEstadisticas | null> {
		const params: Record<string, string> = { fecha };
		if (sedeId) params['sedeId'] = sedeId.toString();

		return this.http
			.get<AsistenciaAdminEstadisticas>(`${this.apiUrl}/estadisticas`, { params })
			.pipe(catchError(() => of(null)));
	}

	listarEstudiantes(sedeId?: number, search?: string): Observable<EstudianteParaSeleccion[]> {
		const params: Record<string, string> = {};
		if (sedeId) params['sedeId'] = sedeId.toString();
		if (search) params['search'] = search;

		return this.http
			.get<EstudianteParaSeleccion[]>(`${this.apiUrl}/estudiantes`, { params })
			.pipe(catchError(() => of([])));
	}

	listarCierres(sedeId?: number, anio?: number): Observable<CierreMensualLista[]> {
		const params: Record<string, string> = {};
		if (sedeId) params['sedeId'] = sedeId.toString();
		if (anio) params['anio'] = anio.toString();

		return this.http
			.get<CierreMensualLista[]>(this.cierreUrl, { params })
			.pipe(catchError(() => of([])));
	}

	// #endregion

	// #region Comandos (POST/PUT/DELETE)

	crearEntrada(dto: CrearEntradaManualRequest): Observable<AsistenciaAdminLista> {
		return this.http.post<AsistenciaAdminLista>(`${this.apiUrl}/entrada`, dto);
	}

	crearSalida(dto: CrearSalidaManualRequest): Observable<AsistenciaAdminLista> {
		return this.http.post<AsistenciaAdminLista>(`${this.apiUrl}/salida`, dto);
	}

	crearCompleta(dto: CrearAsistenciaCompletaRequest): Observable<AsistenciaAdminLista> {
		return this.http.post<AsistenciaAdminLista>(`${this.apiUrl}/completa`, dto);
	}

	actualizarHoras(id: number, dto: ActualizarHorasRequest): Observable<AsistenciaAdminLista> {
		return this.http.put<AsistenciaAdminLista>(`${this.apiUrl}/${id}/horas`, dto);
	}

	eliminar(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
	}

	crearCierre(dto: CrearCierreMensualRequest): Observable<CierreMensualLista> {
		return this.http.post<CierreMensualLista>(this.cierreUrl, dto);
	}

	revertirCierre(id: number, dto: RevertirCierreMensualRequest): Observable<CierreMensualLista> {
		return this.http.post<CierreMensualLista>(`${this.cierreUrl}/${id}/revertir`, dto);
	}

	sincronizarDesdeCrossChex(fecha: string): Observable<string> {
		return this.http.post<string>(`${this.apiUrl}/sync`, null, { params: { fecha } });
	}

	enviarCorreos(dto: EnviarCorreosAsistenciaRequest): Observable<EnviarCorreosResultado> {
		return this.http.post<EnviarCorreosResultado>(`${this.apiUrl}/enviar-correos`, dto);
	}

	// #endregion
}
