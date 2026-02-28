import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
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
  UI_ADMIN_ERROR_DETAILS_DYNAMIC,
  UI_GENERIC_MESSAGES,
  UI_HORARIOS_SUCCESS_MESSAGES,
  UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { CursosApiService } from './cursos-api.service';
import { HorariosApiService } from './horarios-api.service';
import { HorariosStore } from './horarios.store';
import { ProfesoresApiService } from './profesores-api.service';
import { SalonesApiService } from './salones-api.service';

@Injectable({ providedIn: 'root' })
export class HorariosFacade {
  private api = inject(HorariosApiService);
  private salonesApi = inject(SalonesApiService);
  private cursosApi = inject(CursosApiService);
  private profesoresApi = inject(ProfesoresApiService);
  private store = inject(HorariosStore);
  private errorHandler = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private wal = inject(WalFacadeHelper);
  private readonly apiUrl = `${environment.apiUrl}/api/horario`;

  // #region Exponer estado del store
  readonly vm = this.store.vm;

  // #endregion
  // #region Comandos de carga

  /**
   * Cargar todos los horarios y opciones de filtros
   * Estrategia: Refetch completo (incluye estadísticas + opciones para filtros)
   */
  loadAll(): void {
    this.store.setLoading(true);
    this.store.setOptionsLoading(true);
    this.store.clearError();

    const page = this.store.page();
    const pageSize = this.store.pageSize();

    forkJoin({
      horarios: this.api.getAllPaginated(page, pageSize),
      salones: this.salonesApi.listar(),
      cursos: this.cursosApi.listar(),
      profesores: this.profesoresApi.listar(),
    })
      .pipe(
        withRetry({ tag: 'HorariosFacade:loadAll' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ horarios, salones, cursos, profesores }) => {
          this.store.setHorarios(horarios.data);
          this.store.setPaginationData(horarios.page, horarios.pageSize, horarios.total);
          this.store.setSalonesDisponibles(salones);
          this.store.setCursosDisponibles(cursos);
          this.store.setProfesoresDisponibles(profesores);
          this.calculateEstadisticas(horarios.data);
          this.store.setLoading(false);
          this.store.setOptionsLoading(false);
          this.store.setStatsReady(true);
          this.store.setTableReady(true);
        },
        error: (err) => {
          logger.error('Error al cargar datos:', err);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            UI_ADMIN_ERROR_DETAILS.loadHorariosData
          );
          this.store.setError(UI_ADMIN_ERROR_DETAILS.loadHorariosData);
          this.store.setLoading(false);
          this.store.setOptionsLoading(false);
        },
      });
  }

  /**
   * Cargar horarios por salón
   */
  loadBySalon(salonId: number): void {
    this.store.setLoading(true);
    this.store.setFiltroSalon(salonId);

    this.api
      .getBySalon(salonId)
      .pipe(
        withRetry({ tag: 'HorariosFacade:loadBySalon' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (horarios) => {
          this.store.setHorarios(horarios);
          this.calculateEstadisticas(horarios);
          this.store.setLoading(false);
        },
        error: (err) => {
          logger.error('Error al cargar horarios por salón:', err);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            UI_ADMIN_ERROR_DETAILS.loadHorariosSalon
          );
          this.store.setError(UI_ADMIN_ERROR_DETAILS.loadHorariosSalon);
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Cargar horarios por profesor
   */
  loadByProfesor(profesorId: number): void {
    this.store.setLoading(true);
    this.store.setFiltroProfesor(profesorId);

    this.api
      .getByProfesor(profesorId)
      .pipe(
        withRetry({ tag: 'HorariosFacade:loadByProfesor' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (horarios) => {
          this.store.setHorarios(horarios);
          this.calculateEstadisticas(horarios);
          this.store.setLoading(false);
        },
        error: (err) => {
          logger.error('Error al cargar horarios por profesor:', err);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            UI_ADMIN_ERROR_DETAILS.loadHorariosProfesor
          );
          this.store.setError(UI_ADMIN_ERROR_DETAILS.loadHorariosProfesor);
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Cargar detalle de un horario
   */
  loadDetalle(id: number): void {
    this.store.setDetailLoading(true);
    this.store.openDetailDrawer();

    this.api
      .getById(id)
      .pipe(
        withRetry({ tag: 'HorariosFacade:loadDetalle' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detalle) => {
          if (detalle) {
            this.store.setHorarioDetalle(detalle);
          } else {
            this.errorHandler.showError(
              UI_SUMMARIES.error,
              UI_ADMIN_ERROR_DETAILS.horarioNotFound
            );
            this.store.closeDetailDrawer();
          }
          this.store.setDetailLoading(false);
        },
        error: (err) => {
          logger.error('Error al cargar detalle de horario:', err);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            UI_ADMIN_ERROR_DETAILS.horarioDetailLoad
          );
          this.store.setDetailLoading(false);
          this.store.closeDetailDrawer();
        },
      });
  }

  // #endregion
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
        this.refreshHorariosOnly();
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
        // Actualizar con datos reales del servidor
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
          // Aplicar cambio optimista con datos del formulario
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
  // #region Comandos de asignación

  /**
   * Asignar profesor a un horario — WAL con refetch on commit
   */
  asignarProfesor(data: HorarioAsignarProfesorDto): void {
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
        this.refreshHorariosOnly();

        if (this.store.detailDrawerVisible()) {
          this.loadDetalle(data.horarioId);
        }

        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.profesorAssigned
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

  /**
   * Asignar estudiantes a un horario — WAL con refetch on commit
   */
  asignarEstudiantes(data: HorarioAsignarEstudiantesDto): void {
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
        this.refreshHorariosOnly();
        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.estudiantesAssigned
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

  /**
   * Asignar todos los estudiantes del salón al horario — WAL con refetch on commit
   */
  asignarTodosEstudiantes(horarioId: number, usuarioReg: string): void {
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
        this.refreshHorariosOnly();

        if (this.store.detailDrawerVisible()) {
          this.loadDetalle(horarioId);
        }

        this.errorHandler.showSuccess(
          UI_SUMMARIES.success,
          UI_HORARIOS_SUCCESS_MESSAGES.todosEstudiantesAssigned
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
  // #region Comandos de UI

  /**
   * Abrir dialog para crear nuevo horario
   */
  openNewDialog(): void {
    this.store.clearFormData();
    this.store.setEditingId(null);
    this.store.resetWizard();
    this.store.openDialog();
    // Las opciones ya fueron cargadas en loadAll()
  }

  /**
   * Abrir dialog para editar horario existente
   */
  openEditDialog(id: number): void {
    const horario = this.store.horarios().find((h) => h.id === id);
    if (!horario) {
      this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.horarioNotFound);
      return;
    }

    // Cargar datos del horario en el formulario
    this.store.setFormData({
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      salonId: horario.salonId,
      cursoId: horario.cursoId,
      profesorId: horario.profesorId,
      estudianteIds: null, // No se editan desde aquí
    });
    this.store.setEditingId(id);
    this.store.resetWizard();
    this.store.openDialog();
    // Las opciones ya fueron cargadas en loadAll()
  }

  /**
   * Abrir modal de selección de cursos por nivel
   */
  openCursoDialog(): void {
    this.store.openCursoDialog();
  }

  /**
   * Cerrar modal de selección de cursos
   */
  closeCursoDialog(): void {
    this.store.closeCursoDialog();
  }

  /**
   * Seleccionar un curso desde el modal
   */
  selectCurso(cursoId: number): void {
    this.store.setFormData({ cursoId });
    this.store.closeCursoDialog();
  }

  /**
   * Cerrar dialog y limpiar formulario
   */
  closeDialog(): void {
    this.store.closeDialog();
  }

  /**
   * Cerrar drawer de detalle
   */
  closeDetailDrawer(): void {
    this.store.closeDetailDrawer();
  }

  /**
   * Avanzar en el wizard
   */
  nextWizardStep(): void {
    this.store.nextStep();
  }

  /**
   * Retroceder en el wizard
   */
  prevWizardStep(): void {
    this.store.prevStep();
  }

  /**
   * Cargar página específica (llamado desde onLazyLoad del p-table)
   */
  loadPage(page: number, pageSize: number): void {
    this.store.setPaginationData(page, pageSize, this.store.totalRecords());
    this.refreshHorariosOnly();
  }

  // #endregion
  // #region Comandos de filtros

  setFiltroSalon(salonId: number | null): void {
    this.store.setFiltroSalon(salonId);
  }

  setFiltroProfesor(profesorId: number | null): void {
    this.store.setFiltroProfesor(profesorId);
  }

  setFiltroDiaSemana(diaSemana: number | null): void {
    this.store.setFiltroDiaSemana(diaSemana);
  }

  setFiltroEstadoActivo(estadoActivo: boolean | null): void {
    this.store.setFiltroEstadoActivo(estadoActivo);
  }

  clearFiltros(): void {
    this.store.clearFiltros();
    this.loadAll();
  }

  setVistaActual(vista: 'semanal' | 'lista'): void {
    this.store.setVistaActual(vista);
  }

  // #endregion
  // #region Helpers privados

  /**
   * Refetch solo items paginados (sin resetear skeletons ni opciones)
   */
  private refreshHorariosOnly(): void {
    this.store.setLoading(true);
    const page = this.store.page();
    const pageSize = this.store.pageSize();

    this.api
      .getAllPaginated(page, pageSize)
      .pipe(
        withRetry({ tag: 'HorariosFacade:refreshHorariosOnly' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.store.setHorarios(response.data);
          this.store.setPaginationData(response.page, response.pageSize, response.total);
          this.calculateEstadisticas(response.data);
          this.store.setLoading(false);
        },
        error: (err) => {
          logger.error('Error al refrescar horarios:', err);
          this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Calcular estadísticas desde los datos
   */
  private calculateEstadisticas(horarios: any[]): void {
    const stats = {
      totalHorarios: horarios.length,
      horariosActivos: horarios.filter((h) => h.estado).length,
      horariosInactivos: horarios.filter((h) => !h.estado).length,
      horariosConProfesor: horarios.filter((h) => h.profesorId !== null).length,
      horariosSinProfesor: horarios.filter((h) => h.profesorId === null).length,
    };
    this.store.setEstadisticas(stats);
  }

  /**
   * Manejo centralizado de errores de API con mensajes específicos
   */
  private handleApiError(err: any, accion: string): void {
    const mensaje = err?.error?.message || err?.message || UI_GENERIC_MESSAGES.unknownError;

    // Detectar errores comunes
    if (mensaje.includes('conflicto') || mensaje.includes('overlap')) {
      this.errorHandler.showError(
        UI_SUMMARIES.scheduleConflict,
        UI_ADMIN_ERROR_DETAILS.horarioConflict
      );
    } else if (mensaje.includes('no encontrado') || mensaje.includes('not found')) {
      this.errorHandler.showError(
        UI_SUMMARIES.error,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionNotFound(accion)
      );
    } else if (mensaje.includes('validación') || mensaje.includes('validation')) {
      this.errorHandler.showError(
        UI_SUMMARIES.validationError,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioValidation(mensaje)
      );
    } else {
      this.errorHandler.showError(
        UI_SUMMARIES.error,
        UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionFailed(accion)
      );
    }
  }
  // #endregion
}
