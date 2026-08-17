import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { SolicitudJustificacionAsistenciaDto } from '@features/intranet/pages/estudiante/models';

/**
 * Gateway de la bandeja de aprobación (Profesor + roles administrativos),
 * protegida por `JUSTIFICACION_ASISTENCIA_APROBAR` (Plan 101 F4). Dominio
 * `/api/justificacion-asistencia`, distinto del `EstudianteApiService`
 * (mismo controller BE, endpoints de autoservicio vs. bandeja).
 */
@Injectable({ providedIn: 'root' })
export class JustificacionAsistenciaBandejaApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/justificacion-asistencia`;

	getBandeja(): Observable<SolicitudJustificacionAsistenciaDto[]> {
		return this.http.get<SolicitudJustificacionAsistenciaDto[]>(`${this.baseUrl}/bandeja`);
	}

	aprobar(id: number): Observable<SolicitudJustificacionAsistenciaDto> {
		return this.http.post<SolicitudJustificacionAsistenciaDto>(`${this.baseUrl}/${id}/aprobar`, {});
	}

	rechazar(id: number, motivo: string): Observable<SolicitudJustificacionAsistenciaDto> {
		return this.http.post<SolicitudJustificacionAsistenciaDto>(`${this.baseUrl}/${id}/rechazar`, {
			motivo,
		});
	}
}
