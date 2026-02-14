import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@config/environment';
import {
  HorarioAsignarEstudiantesDto,
  HorarioAsignarProfesorDto,
  HorarioCreateDto,
  HorarioDetalleResponseDto,
  HorarioResponseDto,
  HorariosEstadisticas,
  HorarioUpdateDto,
} from '../models/horario.interface';

@Injectable({ providedIn: 'root' })
export class HorariosApiService {
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;
  private http = inject(HttpClient);

  // #region CRUD BÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡sico

  getAll(): Observable<HorarioResponseDto[]> {
    return this.http
      .get<HorarioResponseDto[]>(`${this.apiUrl}`)
      .pipe(catchError(() => of([])));
  }

  getById(id: number): Observable<HorarioDetalleResponseDto | null> {
    return this.http
      .get<HorarioDetalleResponseDto>(`${this.apiUrl}/${id}`)
      .pipe(catchError(() => of(null)));
  }

  create(data: HorarioCreateDto): Observable<HorarioDetalleResponseDto> {
    return this.http.post<HorarioDetalleResponseDto>(`${this.apiUrl}`, data);
  }

  update(id: number, data: HorarioUpdateDto): Observable<HorarioDetalleResponseDto> {
    return this.http.put<HorarioDetalleResponseDto>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`);
  }

  toggleEstado(id: number): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/${id}/toggle-estado`, {});
  }

  // #endregion
  // #region Consultas Especializadas

  getBySalon(salonId: number): Observable<HorarioResponseDto[]> {
    return this.http
      .get<HorarioResponseDto[]>(`${this.apiUrl}/salon/${salonId}`)
      .pipe(catchError(() => of([])));
  }

  getByProfesor(profesorId: number): Observable<HorarioResponseDto[]> {
    return this.http
      .get<HorarioResponseDto[]>(`${this.apiUrl}/profesor/${profesorId}`)
      .pipe(catchError(() => of([])));
  }

  getByDiaSemana(diaSemana: number): Observable<HorarioResponseDto[]> {
    return this.http
      .get<HorarioResponseDto[]>(`${this.apiUrl}/dia/${diaSemana}`)
      .pipe(catchError(() => of([])));
  }

  // #endregion
  // #region Asignaciones

  asignarProfesor(data: HorarioAsignarProfesorDto): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/asignar-profesor`, data);
  }

  asignarEstudiantes(data: HorarioAsignarEstudiantesDto): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/asignar-estudiantes`, data);
  }

  asignarTodosEstudiantes(
    horarioId: number,
    usuarioReg: string
  ): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${horarioId}/asignar-todos-estudiantes?usuarioReg=${usuarioReg}`,
      {}
    );
  }

  // #endregion
  // #region EstadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas

  getEstadisticas(): Observable<HorariosEstadisticas | null> {
    // TODO: Implementar endpoint de estadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas en el backend
    // Por ahora, calcular estadÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas en frontend
    return of(null);
  }
  // #endregion
}
