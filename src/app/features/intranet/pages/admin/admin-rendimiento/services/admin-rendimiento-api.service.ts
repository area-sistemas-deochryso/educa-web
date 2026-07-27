import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { ReporteRendimientoDto } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminRendimientoApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/reportesrendimiento`;

	/**
	 * Trae el rendimiento institucional completo (todos los cursos-contenido de la sede
	 * resuelta server-side). Sin filtros de sede/nivel/período: el ordenamiento por
	 * outlier se resuelve en el FE sobre la lista completa (brief 495).
	 */
	getInstitucional(): Observable<ReporteRendimientoDto[]> {
		return this.http.get<ReporteRendimientoDto[]>(`${this.baseUrl}/institucional`);
	}
}
