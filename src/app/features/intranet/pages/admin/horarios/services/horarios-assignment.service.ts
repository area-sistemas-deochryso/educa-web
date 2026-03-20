import { DestroyRef, inject, Injectable } from '@angular/core';

import { logger } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import type {
  HorarioAsignarEstudiantesDto,
  HorarioAsignarProfesorDto,
} from '../models/horario.interface';
import {
  UI_ADMIN_ERROR_DETAILS_DYNAMIC,
  UI_GENERIC_MESSAGES,
  UI_HORARIOS_SUCCESS_MESSAGES,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { HorariosApiService } from './horarios-api.service';
import { HorariosStore } from './horarios.store';

/**
 * Servicio dedicado a operaciones de asignación/desasignación
 * de profesores y estudiantes en horarios.
 * Extraído de HorariosFacade para mejorar cohesión.
 */
@Injectable({ providedIn: 'root' })
export class HorariosAssignmentService {
  private api = inject(HorariosApiService);
  private store = inject(HorariosStore);
  private errorHandler = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private wal = inject(WalFacadeHelper);
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;

  // #region Asignar

  asignarProfesor(
    data: HorarioAsignarProfesorDto,
    callbacks: { refreshHorarios: () => void; loadDetalle: (id: number) => void },
  ): void {
    const endpoint = `${this.apiUrl}/asignar-profesor`;

    this.wal.execute({
      operation: 'CUSTOM',
      resourceType: 'horarios',
      resourceId: data.horarioId,
      endpoint,
      method: 'POST',
      payload: data,
      http$: () => this.api.asignarProfesor(data),
      onCommit: () => {
        callbacks.refreshHorarios();

        if (this.store.detailDrawerVisible()) {
          callbacks.loadDetalle(data.horarioId);
        }

        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.profesorAssigned,
        );
      },
      onError: (err) => {
        logger.error('Error al asignar profesor:', err);
        this.handleApiError(err, 'asignar el profesor');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.setLoading(true);
        },
        rollback: () => {
          this.store.setLoading(false);
        },
      },
    });
  }

  asignarEstudiantes(
    data: HorarioAsignarEstudiantesDto,
    callbacks: { refreshHorarios: () => void },
  ): void {
    const endpoint = `${this.apiUrl}/asignar-estudiantes`;

    this.wal.execute({
      operation: 'CUSTOM',
      resourceType: 'horarios',
      resourceId: data.horarioId,
      endpoint,
      method: 'POST',
      payload: data,
      http$: () => this.api.asignarEstudiantes(data),
      onCommit: () => {
        callbacks.refreshHorarios();
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.estudiantesAssigned,
        );
      },
      onError: (err) => {
        logger.error('Error al asignar estudiantes:', err);
        this.handleApiError(err, 'asignar los estudiantes');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.setLoading(true);
        },
        rollback: () => {
          this.store.setLoading(false);
        },
      },
    });
  }

  asignarTodosEstudiantes(
    horarioId: number,
    usuarioReg: string,
    callbacks: { refreshHorarios: () => void; loadDetalle: (id: number) => void },
  ): void {
    const endpoint = `${this.apiUrl}/${horarioId}/asignar-todos-estudiantes?usuarioReg=${usuarioReg}`;

    this.wal.execute({
      operation: 'CUSTOM',
      resourceType: 'horarios',
      resourceId: horarioId,
      endpoint,
      method: 'POST',
      payload: { horarioId, usuarioReg },
      http$: () => this.api.asignarTodosEstudiantes(horarioId, usuarioReg),
      onCommit: () => {
        callbacks.refreshHorarios();

        if (this.store.detailDrawerVisible()) {
          callbacks.loadDetalle(horarioId);
        }

        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.todosEstudiantesAssigned,
        );
      },
      onError: (err) => {
        logger.error('Error al asignar todos los estudiantes:', err);
        this.handleApiError(err, 'asignar los estudiantes');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.setLoading(true);
        },
        rollback: () => {
          this.store.setLoading(false);
        },
      },
    });
  }

  // #endregion
  // #region Desasignar

  desasignarProfesor(
    horarioId: number,
    usuarioMod: string,
    callbacks: { refreshHorarios: () => void; loadDetalle: (id: number) => void },
  ): void {
    const endpoint = `${this.apiUrl}/${horarioId}/desasignar-profesor`;

    this.wal.execute({
      operation: 'CUSTOM',
      resourceType: 'horarios',
      resourceId: horarioId,
      endpoint,
      method: 'PUT',
      payload: { horarioId, usuarioMod },
      http$: () => this.api.desasignarProfesor(horarioId, usuarioMod),
      onCommit: () => {
        callbacks.refreshHorarios();
        this.store.incrementarEstadistica('horariosSinProfesor', 1);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.profesorUnassigned,
        );
      },
      onError: (err) => {
        logger.error('Error al desasignar profesor:', err);
        this.handleApiError(err, 'desasignar el profesor');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.clearDetalleProfesor();
          this.store.updateHorario(horarioId, {
            profesorId: null,
            profesorNombreCompleto: null,
          });
          this.store.setLoading(true);
        },
        rollback: () => {
          callbacks.refreshHorarios();
          if (this.store.detailDrawerVisible()) {
            callbacks.loadDetalle(horarioId);
          }
        },
      },
    });
  }

  desasignarEstudiante(
    horarioId: number,
    estudianteId: number,
    callbacks: { refreshHorarios: () => void; loadDetalle: (id: number) => void },
  ): void {
    const endpoint = `${this.apiUrl}/${horarioId}/estudiante/${estudianteId}`;

    this.wal.execute({
      operation: 'DELETE',
      resourceType: 'horarios',
      resourceId: horarioId,
      endpoint,
      method: 'DELETE',
      payload: { horarioId, estudianteId },
      http$: () => this.api.desasignarEstudiante(horarioId, estudianteId),
      onCommit: () => {
        callbacks.refreshHorarios();
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.estudianteUnassigned,
        );
      },
      onError: (err) => {
        logger.error('Error al desasignar estudiante:', err);
        this.handleApiError(err, 'desasignar el estudiante');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.removeEstudianteFromDetalle(estudianteId);
          this.store.setLoading(true);
        },
        rollback: () => {
          if (this.store.detailDrawerVisible()) {
            callbacks.loadDetalle(horarioId);
          }
        },
      },
    });
  }

  // #endregion
  // #region Helpers privados

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleApiError(err: any, accion: string): void {
    const mensaje = err?.error?.message || err?.message || UI_GENERIC_MESSAGES.unknownError;

    if (mensaje.includes('conflicto') || mensaje.includes('overlap')) {
      this.errorHandler.showError(
        UI_SUMMARIES.scheduleConflict,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionNotFound(accion),
      );
    } else if (mensaje.includes('no encontrado') || mensaje.includes('not found')) {
      this.errorHandler.showError(
        UI_SUMMARIES.error,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionNotFound(accion),
      );
    } else {
      this.errorHandler.showError(
        UI_SUMMARIES.error,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionFailed(accion),
      );
    }
  }

  // #endregion
}
