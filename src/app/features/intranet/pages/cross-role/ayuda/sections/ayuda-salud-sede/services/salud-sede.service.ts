import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';

import { CrearReporteSaludDto, EstadoSaludSedeDto } from '../models/salud-sede.models';

/**
 * Gateway de los endpoints de salud de sede del panel de ayuda.
 * Reportar es abierto a cualquier rol (sin gate de capability) y consultar el
 * estado vigente devuelve el mismo valor sin importar qué rol pregunte — el
 * BE ya resuelve ambas reglas, este service solo pasa la request.
 */
@Injectable({ providedIn: 'root' })
export class SaludSedeService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/salud-sede`;

	crearReporte(dto: CrearReporteSaludDto): Observable<void> {
		return this.http.post<void>(`${this.apiUrl}/reportes`, dto);
	}

	getEstadoVigente(): Observable<EstadoSaludSedeDto[]> {
		return this.http.get<EstadoSaludSedeDto[]>(`${this.apiUrl}/estado`);
	}
}
