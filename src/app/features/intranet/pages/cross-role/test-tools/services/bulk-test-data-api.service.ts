// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { CreacionMasivaResponseDto, CrearCursoDto, CrearSalonDto, CrearUsuarioDto } from '../models';

// #endregion
// #region Implementation

/**
 * Los 6 endpoints de creación masiva de prueba (P107 F3, BusinessTestMode) — 622 (BE)
 * los shippeó para Salones y Cursos, 625 (BE) sumó Usuarios (cualquier rol).
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

	generarUsuarios(rol: string, cantidad: number): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/usuarios/prueba/generar`,
			{ rol, cantidad },
		);
	}

	loteUsuarios(usuarios: CrearUsuarioDto[]): Observable<CreacionMasivaResponseDto> {
		return this.http.post<CreacionMasivaResponseDto>(
			`${this.baseUrl}/api/sistema/usuarios/prueba/lote`,
			{ usuarios },
		);
	}
}
// #endregion
