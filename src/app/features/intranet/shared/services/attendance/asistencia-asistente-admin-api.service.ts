import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { AsistenciaAsistenteAdminDto, AsistenciaDiaAsistentesAdminConEstadisticas } from '@data/models';

/**
 * Gateway HTTP para la vista admin de asistencia de Asistentes Administrativos
 * (sub-tab del panel director). Tras brief 145 quedó únicamente el endpoint
 * agregado por sede; el flujo self-service `/me/*` fue eliminado.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaAsistenteAdminApiService {
	private readonly http = inject(HttpClient);
	private readonly consultaBaseUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	obtenerAsistenciaDiaAsistentesAdminDirector(
		fecha: Date,
	): Observable<AsistenciaDiaAsistentesAdminConEstadisticas> {
		const params = { fecha: this.formatDateLocal(fecha) };
		return this.http.get<AsistenciaDiaAsistentesAdminConEstadisticas>(
			`${this.consultaBaseUrl}/director/asistentes-admin-asistencia-dia`,
			{ params },
		);
	}

	listarAsistentesAdmin(
		fechaInicio: Date,
		fechaFin: Date,
	): Observable<AsistenciaAsistenteAdminDto[]> {
		const params = {
			fechaInicio: this.formatDateLocal(fechaInicio),
			fechaFin: this.formatDateLocal(fechaFin),
		};
		return this.http.get<AsistenciaAsistenteAdminDto[]>(
			`${this.consultaBaseUrl}/director/asistentes-admin`,
			{ params },
		);
	}

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}
