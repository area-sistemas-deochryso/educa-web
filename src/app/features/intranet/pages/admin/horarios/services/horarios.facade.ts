import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
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

    const page = this.store.page();
    const pageSize = this.store.pageSize();

    forkJoin({
      horarios: this.api.getAllPaginated(page, pageSize),
      salones: this.salonesApi.listar(),
      cursos: this.cursosApi.listar(),
      profesores: this.profesoresApi.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
   * CREAR: Refetch para obtener ID del servidor + actualizar stats
   */
  create(data: HorarioCreateDto): void {
    this.store.setLoading(true);

    this.api
      .create(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refreshHorariosOnly();
          this.store.incrementarEstadistica('totalHorarios', 1);
          this.store.incrementarEstadistica('horariosActivos', 1);
          // Note: profesor se asigna después con asignarProfesor()
          this.store.closeDialog();
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.created
          );
        },
        error: (err) => {
          logger.error('Error al crear horario:', err);
          this.handleApiError(err, 'crear');
          this.store.setLoading(false);
        },
      });
  }

  /**
   * EDITAR: Mutación quirúrgica (no refetch)
   */
  update(id: number, data: HorarioUpdateDto): void {
    this.store.setLoading(true);

    // Guardar estado anterior para rollback si falla
    const horarioActual = this.store.horarios().find((h) => h.id === id);

    this.api
      .update(id, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Mutación quirúrgica: actualizar solo este item
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

          // Actualizar stats incrementalmente si cambió el profesor
          if (horarioActual) {
            if (horarioActual.profesorId === null && updated.profesorId !== null) {
              this.store.incrementarEstadistica('horariosSinProfesor', -1);
            } else if (horarioActual.profesorId !== null && updated.profesorId === null) {
              this.store.incrementarEstadistica('horariosSinProfesor', 1);
            }
          }

          this.store.setLoading(false);
          this.store.closeDialog();
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.updated
          );
        },
        error: (err) => {
          logger.error('Error al actualizar horario:', err);
          this.handleApiError(err, 'actualizar');
          this.store.setLoading(false);
        },
      });
  }

  /**
   * TOGGLE: Mutación quirúrgica local (no refetch)
   */
  toggleEstado(id: number, estadoActual: boolean): void {
    this.store.setLoading(true);
    const nuevoEstado = !estadoActual;

    this.api
      .toggleEstado(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Mutación quirúrgica: toggle solo este item
          this.store.toggleHorarioEstado(id);

          // Actualizar stats incrementalmente
          if (nuevoEstado) {
            this.store.incrementarEstadistica('horariosActivos', 1);
            this.store.incrementarEstadistica('horariosInactivos', -1);
          } else {
            this.store.incrementarEstadistica('horariosActivos', -1);
            this.store.incrementarEstadistica('horariosInactivos', 1);
          }

          this.store.setLoading(false);
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES_DYNAMIC.toggleEstado(nuevoEstado)
          );
        },
        error: (err) => {
          logger.error('Error al cambiar estado de horario:', err);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            UI_ADMIN_ERROR_DETAILS.horarioEstadoChange
          );
          this.store.setLoading(false);
        },
      });
  }

  /**
   * ELIMINAR: Mutación quirúrgica + stats incrementales
   */
  delete(id: number): void {
    this.store.setLoading(true);

    // Guardar referencia para actualizar stats
    const horario = this.store.horarios().find((h) => h.id === id);

    this.api
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Mutación quirúrgica: eliminar solo este item
          this.store.removeHorario(id);

          // Actualizar stats incrementalmente
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

          this.store.setLoading(false);
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.deleted
          );
        },
        error: (err) => {
          logger.error('Error al eliminar horario:', err);
          this.handleApiError(err, 'eliminar');
          this.store.setLoading(false);
        },
      });
  }

  // #endregion
  // #region Comandos de asignación

  /**
   * Asignar profesor a un horario
   */
  asignarProfesor(data: HorarioAsignarProfesorDto): void {
    this.store.setLoading(true);

    this.api
      .asignarProfesor(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Refetch para obtener datos actualizados
          this.refreshHorariosOnly();

          // Si el drawer está abierto, recargar el detalle
          if (this.store.detailDrawerVisible()) {
            this.loadDetalle(data.horarioId);
          }

          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.profesorAssigned
          );
        },
        error: (err) => {
          logger.error('Error al asignar profesor:', err);
          this.handleApiError(err, 'asignar el profesor');
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Asignar estudiantes a un horario
   */
  asignarEstudiantes(data: HorarioAsignarEstudiantesDto): void {
    this.store.setLoading(true);

    this.api
      .asignarEstudiantes(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Refetch para obtener datos actualizados
          this.refreshHorariosOnly();
          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.estudiantesAssigned
          );
        },
        error: (err) => {
          logger.error('Error al asignar estudiantes:', err);
          this.handleApiError(err, 'asignar los estudiantes');
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Asignar todos los estudiantes del salón al horario
   */
  asignarTodosEstudiantes(horarioId: number, usuarioReg: string): void {
    this.store.setLoading(true);

    this.api
      .asignarTodosEstudiantes(horarioId, usuarioReg)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Refetch para obtener datos actualizados
          this.refreshHorariosOnly();

          // Si el drawer está abierto, recargar el detalle
          if (this.store.detailDrawerVisible()) {
            this.loadDetalle(horarioId);
          }

          this.errorHandler.showSuccess(
            UI_SUMMARIES.success,
            UI_HORARIOS_SUCCESS_MESSAGES.todosEstudiantesAssigned
          );
        },
        error: (err) => {
          logger.error('Error al asignar todos los estudiantes:', err);
          this.handleApiError(err, 'asignar los estudiantes');
          this.store.setLoading(false);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.store.setHorarios(response.data);
          this.store.setPaginationData(response.page, response.pageSize, response.total);
          this.calculateEstadisticas(response.data);
          this.store.setLoading(false);
        },
        error: (err) => {
          logger.error('Error al refrescar horarios:', err);
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
