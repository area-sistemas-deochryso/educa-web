// #region Imports
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@config/environment';
import { SalonListDto } from '../models/salon.interface';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class SalonesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/sistema/salones`;

  /**
   * GET /api/sistema/salones/listar
   * Lista todos los salones activos con informaciÃƒÂ³n completa
   */
  listar(): Observable<SalonListDto[]> {
    return this.http.get<SalonListDto[]>(`${this.apiUrl}/listar`);
  }

  /**
   * GET /api/sistema/salones/{id}
   * Obtiene un salÃƒÂ³n por ID
   */
  obtenerPorId(id: number): Observable<SalonListDto> {
    return this.http.get<SalonListDto>(`${this.apiUrl}/${id}`);
  }
}
// #endregion
