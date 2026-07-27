import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@config/environment';
import { ReporteRendimientoPropioDto } from './estudiante-rendimiento.models';

@Injectable({ providedIn: 'root' })
export class EstudianteRendimientoApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/api/reportesrendimiento`;

	getMiRendimiento(): Observable<ReporteRendimientoPropioDto> {
		return this.http.get<ReporteRendimientoPropioDto>(`${this.baseUrl}/mi-rendimiento`);
	}
}
