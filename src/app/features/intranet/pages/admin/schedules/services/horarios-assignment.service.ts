import { inject, Injectable } from '@angular/core';

import { facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import type {
  HorarioAsignarEstudiantesDto,
  HorarioAsignarProfesorDto,
} from '../models/horario.interface';
import {
  UI_HORARIOS_SUCCESS_MESSAGES,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { HORARIO_ERROR_POLICY } from '../helpers/horario-error.utils';
import { SchedulesApiService } from './horarios-api.service';
import { SchedulesStore } from './horarios.store';

/**
 * Servicio dedicado a operaciones de asignación/desasignación
 * de profesores y estudiantes en horarios.
 * Extraído de SchedulesCrudFacade para mejorar cohesión.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesAssignmentService {
  private api = inject(SchedulesApiService);
  private store = inject(SchedulesStore);
  private errorHandler = inject(ErrorHandlerService);

  private wal = inject(WalFacadeHelper);
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;
  private readonly errHandler = facadeErrorHandler({
    tag: 'SchedulesAssignmentService',
    errorHandler: this.errorHandler,
    policy: HORARIO_ERROR_POLICY,
  });

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
        this.errHandler.handle(err, 'asignar el profesor', () => {
          this.store.setLoading(false);
        });
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
        this.errHandler.handle(err, 'asignar los estudiantes', () => {
          this.store.setLoading(false);
        });
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
        this.errHandler.handle(err, 'asignar los estudiantes', () => {
          this.store.setLoading(false);
        });
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
        this.errHandler.handle(err, 'desasignar el profesor', () => {
          this.store.setLoading(false);
        });
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
        this.errHandler.handle(err, 'desasignar el estudiante', () => {
          this.store.setLoading(false);
        });
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
}
