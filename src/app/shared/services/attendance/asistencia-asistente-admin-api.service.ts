import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { AsistenciaDiaAsistentesAdminConEstadisticas } from '@data/models/attendance.models';

/**
 * Gateway HTTP para la vista admin de asistencia de Asistentes Administrativos
 * (sub-tab del panel director). Tras brief 145 quedó únicamente el endpoint
 * agregado por sede; el flujo self-service `/me/*` fue eliminado.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaAsistenteAdminApiService {
	private readonly http = inject(HttpClient);
	private readonly consultaBaseUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	/**
	 * Lista todos los Asistentes Administrativos activos de la sede con su asistencia
	 * del día + estadísticas. Consumido por la vista admin "Asistentes Administrativos"
	 * en modo día.
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

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}
