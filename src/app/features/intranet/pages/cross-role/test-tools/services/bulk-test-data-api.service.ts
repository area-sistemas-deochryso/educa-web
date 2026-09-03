// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { CreacionMasivaResponseDto, CrearCursoDto, CrearSalonDto } from '../models';

// #endregion
// #region Implementation

/**
 * Los 4 endpoints de creación masiva de prueba (P107 F3, BusinessTestMode) — 622 (BE)
 * ya los shippeó para Salones y Cursos. Usuarios se suma acá cuando 625 cierre.
 */
@Injectable({ providedIn: 'root' })
export class BulkTestDataApiService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = environment.apiUrl;

	generarSalones(cantidad: number): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/salones/prueba/generar`,
			{ cantidad },
		);
	}

	loteSalones(salones: CrearSalonDto[]): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/salones/prueba/lote`,
			{ salones },
		);
	}

	generarCursos(cantidad: number): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/cursos/prueba/generar`,
			{ cantidad },
		);
	}

	loteCursos(cursos: CrearCursoDto[]): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/cursos/prueba/lote`,
			{ cursos },
		);
	}
}
// #endregion
