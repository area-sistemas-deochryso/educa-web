import { inject, Injectable } from '@angular/core';

import { getEstadoToggleDeltas, getEstadoRollbackDeltas, facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { type ImportarHorarioItem } from '../helpers/horario-import.config';
import {
  type HorarioAsignarEstudiantesDto,
  type HorarioAsignarProfesorDto,
  type HorarioCreateDto,
  type HorarioUpdateDto,
} from '../models/horario.interface';
import {
  UI_HORARIOS_SUCCESS_MESSAGES,
  UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { HORARIO_ERROR_POLICY } from '../helpers/horario-error.utils';
import { SchedulesApiService } from './horarios-api.service';
import { SchedulesAssignmentService } from './horarios-assignment.service';
import { SchedulesDataFacade } from './horarios-data.facade';
import { SchedulesStore } from './horarios.store';

/**
 * CRUD facade: create, update, delete, toggle, assignment operations.
 * Delegates refresh to SchedulesDataFacade after mutations.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesCrudFacade {
  private api = inject(SchedulesApiService);
  private store = inject(SchedulesStore);
  private dataFacade = inject(SchedulesDataFacade);
  private assignment = inject(SchedulesAssignmentService);
  private errorHandler = inject(ErrorHandlerService);
  private wal = inject(WalFacadeHelper);
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;
  private readonly errHandler = facadeErrorHandler({
    tag: 'SchedulesCrudFacade',
    errorHandler: this.errorHandler,
    policy: HORARIO_ERROR_POLICY,
  });

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
        this.dataFacade.silentRefreshAfterCrud();
        this.store.incrementarEstadistica('totalHorarios', 1);
        this.store.incrementarEstadistica('horariosActivos', 1);
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.created
        );
      },
      onError: (err) => {
        this.errHandler.handle(err, 'crear horario');
      },
      optimistic: {
        apply: () => {
          this.store.formStore.closeDialog();
        },
        rollback: () => {},
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

        this.dataFacade.silentRefreshAfterCrud();
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.updated
        );
      },
      onError: (err) => {
        this.errHandler.handle(err, 'actualizar horario');
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
          this.store.formStore.closeDialog();
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
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC.toggleEstado(nuevoEstado)
        );
      },
      onError: (err) => {
        this.errHandler.handle(err, 'cambiar estado de horario');
      },
      optimistic: {
        apply: () => {
          const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(estadoActual);
          this.store.toggleHorarioEstado(id);
          this.store.incrementarEstadistica('horariosActivos', activosDelta);
          this.store.incrementarEstadistica('horariosInactivos', inactivosDelta);
        },
        rollback: () => {
          const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(estadoActual);
          this.store.toggleHorarioEstado(id);
          this.store.incrementarEstadistica('horariosActivos', activosDelta);
          this.store.incrementarEstadistica('horariosInactivos', inactivosDelta);
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
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.deleted
        );
      },
      onError: (err) => {
        this.errHandler.handle(err, 'eliminar horario');
      },
      optimistic: {
        apply: () => {
          this.store.removeHorario(id);
          this.store.incrementarEstadistica('totalHorarios', -1);
          if (horario) {
            const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(horario.estado, 'delete');
            this.store.incrementarEstadistica('horariosActivos', activosDelta);
            this.store.incrementarEstadistica('horariosInactivos', inactivosDelta);
            if (horario.profesorId === null) {
              this.store.incrementarEstadistica('horariosSinProfesor', -1);
            }
          }
        },
        rollback: () => {
          if (horario) {
            const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(horario.estado, 'delete');
            this.store.addHorario(horario);
            this.store.incrementarEstadistica('totalHorarios', 1);
            this.store.incrementarEstadistica('horariosActivos', activosDelta);
            this.store.incrementarEstadistica('horariosInactivos', inactivosDelta);
            if (horario.profesorId === null) {
              this.store.incrementarEstadistica('horariosSinProfesor', 1);
            }
          }
        },
      },
    });
  }

  // #endregion
  // #region Comando de importación

  importarHorarios(items: ImportarHorarioItem[]): void {
    this.store.setImportLoading(true);

    this.api.importarHorarios(items).subscribe({
      next: (result) => {
        this.store.setImportResult(result);
        this.store.setImportLoading(false);

        if (result.creados > 0) {
          this.dataFacade.silentRefreshAfterCrud();
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            `${result.creados} horario(s) importado(s) correctamente`,
          );
        }
      },
      error: (err) => {
        this.store.setImportLoading(false);
        this.errHandler.handle(err, 'importar horarios');
      },
    });
  }

  // #endregion
  // #region Comandos de asignación (delegados a SchedulesAssignmentService)

  private get assignmentCallbacks() {
    return {
      refreshHorarios: () => this.dataFacade.silentRefreshAfterCrud(),
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
}
