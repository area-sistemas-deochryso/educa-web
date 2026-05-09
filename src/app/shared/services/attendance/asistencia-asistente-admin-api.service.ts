import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import {
	AsistenciaAsistenteAdminDto,
	AsistenciaDiaAsistentesAdminConEstadisticas,
} from '@data/models/attendance.models';

/**
 * Gateway HTTP para endpoints de asistencia de Asistentes Administrativos
 * (Plan 28 Chat 3d backend + Chat 4 frontend).
 *
 *  Self-service (rol Asistente Administrativo, DNI desde claim):
 *  - GET /api/asistente-administrativo/me/dia
 *  - GET /api/asistente-administrativo/me/mes
 *
 *  Director / Administrativos:
 *  - GET /api/ConsultaAsistencia/director/asistentes-admin-asistencia-dia
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaAsistenteAdminApiService {
	private readonly http = inject(HttpClient);
	private readonly selfBaseUrl = `${environment.apiUrl}/api/asistente-administrativo`;
	private readonly consultaBaseUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	// #region Self-service (AA autenticado)

	/**
	 * Día puntual del Asistente Administrativo autenticado.
	 * El backend extrae el DNI del claim — INV-AD08 (read-only).
	 */
	obtenerMiAsistenciaDia(fecha: Date): Observable<AsistenciaAsistenteAdminDto> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get<AsistenciaAsistenteAdminDto>(`${this.selfBaseUrl}/me/dia`, { params });
	}

	/**
	 * Mes completo del Asistente Administrativo autenticado (default: mes actual).
	 * El backend extrae el DNI del claim — INV-AD08 (read-only).
	 */
	obtenerMiAsistenciaMes(mes?: number, anio?: number): Observable<AsistenciaAsistenteAdminDto> {
		const params: Record<string, string> = {};
		if (mes !== undefined) params['mes'] = mes.toString();
		if (anio !== undefined) params['anio'] = anio.toString();

		return this.http.get<AsistenciaAsistenteAdminDto>(`${this.selfBaseUrl}/me/mes`, { params });
	}

	// #endregion
	// #region Director / Administrativos

	/**
	 * Lista todos los Asistentes Administrativos activos de la sede con su asistencia
	 * del día + estadísticas. Consumido por la vista admin "Asistentes Administrativos"
	 * en modo día (Plan 28 Chat 4b-tab).
	 */
	obtenerAsistenciaDiaAsistentesAdminDirector(
		fecha: Date,
	): Observable<AsistenciaDiaAsistentesAdminConEstadisticas> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get<AsistenciaDiaAsistentesAdminConEstadisticas>(
			`${this.consultaBaseUrl}/director/asistentes-admin-asistencia-dia`,
			{ params },
		);
	}

	// #endregion
	// #region Helpers privados

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	// #endregion
}
