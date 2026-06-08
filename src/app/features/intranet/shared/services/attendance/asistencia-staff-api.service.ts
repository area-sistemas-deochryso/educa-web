import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { AsistenciaDiaStaffConEstadisticas } from '@data/models';

@Injectable({ providedIn: 'root' })
export class AsistenciaStaffApiService {
	private readonly http = inject(HttpClient);
	private readonly consultaBaseUrl = `${environment.apiUrl}/api/ConsultaAsistencia`;

	obtenerAsistenciaDiaStaffDirector(
		tipoPersona: string,
		fecha: Date,
	): Observable<AsistenciaDiaStaffConEstadisticas> {
		const params = {
			tipoPersona,
			fecha: this.formatDateLocal(fecha),
		};
		return this.http.get<AsistenciaDiaStaffConEstadisticas>(
			`${this.consultaBaseUrl}/director/staff-asistencia-dia`,
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
