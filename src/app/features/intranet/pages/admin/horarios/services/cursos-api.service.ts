import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { CursoListaDto } from '../models/curso.interface';

@Injectable({ providedIn: 'root' })
export class CursosApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/sistema/cursos`;

  /**
   * GET /api/sistema/cursos/listar
   * Lista todos los cursos activos
   */
  listar(): Observable<CursoListaDto[]> {
    return this.http.get<CursoListaDto[]>(`${this.apiUrl}/listar`);
  }

  /**
   * GET /api/sistema/cursos/{id}
   * Obtiene un curso por ID
   */
  obtenerPorId(id: number): Observable<CursoListaDto> {
    return this.http.get<CursoListaDto>(`${this.apiUrl}/${id}`);
  }
}
