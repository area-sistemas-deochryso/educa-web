import { inject, Injectable } from '@angular/core';

import { logger } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import {
  type HorarioAsignarEstudiantesDto,
  type HorarioAsignarProfesorDto,
  type HorarioCreateDto,
  type HorarioUpdateDto,
} from '../models/horario.interface';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_HORARIOS_SUCCESS_MESSAGES,
  UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { handleHorarioApiError } from '../helpers/horario-error.utils';
import { HorariosApiService } from './horarios-api.service';
import { HorariosAssignmentService } from './horarios-assignment.service';
import { HorariosDataFacade } from './horarios-data.facade';
import { HorariosStore } from './horarios.store';

/**
 * CRUD facade: create, update, delete, toggle, assignment operations.
 * Delegates refresh to HorariosDataFacade after mutations.
 */
@Injectable({ providedIn: 'root' })
export class HorariosCrudFacade {
  private api = inject(HorariosApiService);
  private store = inject(HorariosStore);
  private dataFacade = inject(HorariosDataFacade);
  private assignment = inject(HorariosAssignmentService);
  private errorHandler = inject(ErrorHandlerService);
  private wal = inject(WalFacadeHelper);
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;

  // #region Comandos CRUD

  /**
   * CREAR: Optimistic close dialog + WAL (refetch on commit for server ID)
   */
  create(data: HorarioCreateDto): void {
    const endpoint = this.apiUrl;

    this.wal.execute({
      operation: 'CREATE',
      resourceType: 'horarios',
      endpoint,
      method: 'POST',
      payload: data,
      http$: () => this.api.create(data),
      onCommit: () => {
        this.dataFacade.refreshHorariosOnly();
        this.store.incrementarEstadistica('totalHorarios', 1);
        this.store.incrementarEstadistica('horariosActivos', 1);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.created
        );
      },
      onError: (err) => {
        logger.error('Error al crear horario:', err);
        this.handleApiError(err, 'crear');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.closeDialog();
          this.store.setLoading(true);
        },
        rollback: () => {
          this.store.setLoading(false);
        },
      },
    });
  }

  /**
   * EDITAR: Optimistic quirurgical update + WAL
   */
  update(id: number, data: HorarioUpdateDto): void {
    const endpoint = `${this.apiUrl}/${id}`;
    const horarioActual = this.store.horarios().find((h) => h.id === id);

    // Snapshot para rollback
    const previousData = horarioActual
      ? {
          diaSemana: horarioActual.diaSemana,
          diaSemanaDescripcion: horarioActual.diaSemanaDescripcion,
          horaInicio: horarioActual.horaInicio,
          horaFin: horarioActual.horaFin,
          salonId: horarioActual.salonId,
          salonDescripcion: horarioActual.salonDescripcion,
          cursoId: horarioActual.cursoId,
          cursoNombre: horarioActual.cursoNombre,
          profesorId: horarioActual.profesorId,
          profesorNombreCompleto: horarioActual.profesorNombreCompleto,
        }
      : null;

    this.wal.execute({
      operation: 'UPDATE',
      resourceType: 'horarios',
      resourceId: id,
      endpoint,
      method: 'PUT',
      payload: { ...data, rowVersion: horarioActual?.rowVersion },
      http$: () => this.api.update(id, { ...data, rowVersion: horarioActual?.rowVersion }),
      onCommit: (updated) => {
        this.store.updateHorario(id, {
          diaSemana: updated.diaSemana,
          diaSemanaDescripcion: updated.diaSemanaDescripcion,
          horaInicio: updated.horaInicio,
          horaFin: updated.horaFin,
          salonId: updated.salonId,
          salonDescripcion: updated.salonDescripcion,
          cursoId: updated.cursoId,
          cursoNombre: updated.cursoNombre,
          profesorId: updated.profesorId,
          profesorNombreCompleto: updated.profesorNombreCompleto,
        });

        // Actualizar stats si cambió el profesor
        if (horarioActual) {
          if (horarioActual.profesorId === null && updated.profesorId !== null) {
            this.store.incrementarEstadistica('horariosSinProfesor', -1);
          } else if (horarioActual.profesorId !== null && updated.profesorId === null) {
            this.store.incrementarEstadistica('horariosSinProfesor', 1);
          }
        }

        this.store.setLoading(false);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.updated
        );
      },
      onError: (err) => {
        logger.error('Error al actualizar horario:', err);
        this.handleApiError(err, 'actualizar');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.updateHorario(id, {
            diaSemana: data.diaSemana,
            horaInicio: data.horaInicio,
            horaFin: data.horaFin,
            salonId: data.salonId,
            cursoId: data.cursoId,
          });
          this.store.closeDialog();
          this.store.setLoading(true);
        },
        rollback: () => {
          if (previousData) {
            this.store.updateHorario(id, previousData);
          }
        },
      },
    });
  }

  /**
   * TOGGLE: Optimistic toggle + WAL
   */
  toggleEstado(id: number, estadoActual: boolean): void {
    const nuevoEstado = !estadoActual;
    const endpoint = `${this.apiUrl}/${id}/toggle-estado`;

    this.wal.execute({
      operation: 'TOGGLE',
      resourceType: 'horarios',
      resourceId: id,
      endpoint,
      method: 'PUT',
      payload: { estado: nuevoEstado },
      http$: () => this.api.toggleEstado(id),
      onCommit: () => {
        this.store.setLoading(false);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC.toggleEstado(nuevoEstado)
        );
      },
      onError: (err) => {
        logger.error('Error al cambiar estado de horario:', err);
        this.errorHandler.showError(
          UI_SUMMARIES.error,
          UI_ADMIN_ERROR_DETAILS.horarioEstadoChange
        );
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.toggleHorarioEstado(id);
          if (nuevoEstado) {
            this.store.incrementarEstadistica('horariosActivos', 1);
            this.store.incrementarEstadistica('horariosInactivos', -1);
          } else {
            this.store.incrementarEstadistica('horariosActivos', -1);
            this.store.incrementarEstadistica('horariosInactivos', 1);
          }
          this.store.setLoading(true);
        },
        rollback: () => {
          this.store.toggleHorarioEstado(id);
          if (nuevoEstado) {
            this.store.incrementarEstadistica('horariosActivos', -1);
            this.store.incrementarEstadistica('horariosInactivos', 1);
          } else {
            this.store.incrementarEstadistica('horariosActivos', 1);
            this.store.incrementarEstadistica('horariosInactivos', -1);
          }
        },
      },
    });
  }

  /**
   * ELIMINAR: Optimistic remove + WAL
   */
  delete(id: number): void {
    const horario = this.store.horarios().find((h) => h.id === id);
    const endpoint = `${this.apiUrl}/${id}`;

    this.wal.execute({
      operation: 'DELETE',
      resourceType: 'horarios',
      resourceId: id,
      endpoint,
      method: 'DELETE',
      payload: null,
      http$: () => this.api.delete(id),
      onCommit: () => {
        this.store.setLoading(false);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.deleted
        );
      },
      onError: (err) => {
        logger.error('Error al eliminar horario:', err);
        this.handleApiError(err, 'eliminar');
        this.store.setLoading(false);
      },
      optimistic: {
        apply: () => {
          this.store.removeHorario(id);
          this.store.incrementarEstadistica('totalHorarios', -1);
          if (horario) {
            if (horario.estado) {
              this.store.incrementarEstadistica('horariosActivos', -1);
            } else {
              this.store.incrementarEstadistica('horariosInactivos', -1);
            }
            if (horario.profesorId === null) {
              this.store.incrementarEstadistica('horariosSinProfesor', -1);
            }
          }
          this.store.setLoading(true);
        },
        rollback: () => {
          if (horario) {
            this.store.addHorario(horario);
            this.store.incrementarEstadistica('totalHorarios', 1);
            if (horario.estado) {
              this.store.incrementarEstadistica('horariosActivos', 1);
            } else {
              this.store.incrementarEstadistica('horariosInactivos', 1);
            }
            if (horario.profesorId === null) {
              this.store.incrementarEstadistica('horariosSinProfesor', 1);
            }
          }
        },
      },
    });
  }

  // #endregion
  // #region Comandos de asignación (delegados a HorariosAssignmentService)

  private get assignmentCallbacks() {
    return {
      refreshHorarios: () => this.dataFacade.refreshHorariosOnly(),
      loadDetalle: (id: number) => this.dataFacade.loadDetalle(id),
    };
  }

  asignarProfesor(data: HorarioAsignarProfesorDto): void {
    this.assignment.asignarProfesor(data, this.assignmentCallbacks);
  }

  asignarEstudiantes(data: HorarioAsignarEstudiantesDto): void {
    this.assignment.asignarEstudiantes(data, this.assignmentCallbacks);
  }

  asignarTodosEstudiantes(horarioId: number, usuarioReg: string): void {
    this.assignment.asignarTodosEstudiantes(horarioId, usuarioReg, this.assignmentCallbacks);
  }

  desasignarProfesor(horarioId: number, usuarioMod: string): void {
    this.assignment.desasignarProfesor(horarioId, usuarioMod, this.assignmentCallbacks);
  }

  desasignarEstudiante(horarioId: number, estudianteId: number): void {
    this.assignment.desasignarEstudiante(horarioId, estudianteId, this.assignmentCallbacks);
  }

  // #endregion
  // #region Helpers privados

  private handleApiError(err: unknown, accion: string): void {
    handleHorarioApiError(this.errorHandler, err, accion);
  }

  // #endregion
}
