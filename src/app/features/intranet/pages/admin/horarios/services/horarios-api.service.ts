import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@config/environment';
import { PaginatedResponse } from '@shared/models';
import { type ImportarHorarioItem, type ImportarHorariosResult } from '../helpers/horario-import.config';
import {
  type DiaSemana,
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

  // #region CRUD Básico

  getAll(): Observable<HorarioResponseDto[]> {
    return this.http
      .get<HorarioResponseDto[]>(`${this.apiUrl}`)
      .pipe(catchError(() => of([])));
  }

  getAllPaginated(
    page: number,
    pageSize: number
  ): Observable<PaginatedResponse<HorarioResponseDto>> {
    return this.http.get<PaginatedResponse<HorarioResponseDto>>(
      `${this.apiUrl}`,
      { params: { page, pageSize } }
    );
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

  getByDiaSemana(diaSemana: DiaSemana): Observable<HorarioResponseDto[]> {
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

  desasignarProfesor(horarioId: number, usuarioMod: string): Observable<boolean> {
    return this.http.put<boolean>(
      `${this.apiUrl}/${horarioId}/desasignar-profesor?usuarioMod=${usuarioMod}`,
      {}
    );
  }

  desasignarEstudiante(horarioId: number, estudianteId: number): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.apiUrl}/${horarioId}/estudiante/${estudianteId}`
    );
  }

  // #endregion
  // #region Import

  importarHorarios(items: ImportarHorarioItem[]): Observable<ImportarHorariosResult> {
    return this.http.post<ImportarHorariosResult>(`${this.apiUrl}/importar`, { items });
  }

  // #endregion
  // #region Estadísticas

  getEstadisticas(): Observable<HorariosEstadisticas | null> {
    // TODO: Implementar endpoint GET /api/horarios/estadisticas en el backend.
    // Actualmente las estadísticas se calculan en frontend a partir de la lista de horarios,
    // lo que funciona pero es ineficiente con paginación (solo cuenta la página actual).
    // Bloqueante para: stats precisas con muchos horarios. Workaround actual: facade calcula desde array local.
    return of(null);
  }
  // #endregion
}
