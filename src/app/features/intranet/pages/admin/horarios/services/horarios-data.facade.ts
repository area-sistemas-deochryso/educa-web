import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { CursosApiService } from './cursos-api.service';
import { HorariosApiService } from './horarios-api.service';
import { HorariosStore } from './horarios.store';
import { ProfesoresApiService } from './profesores-api.service';
import { SalonesApiService } from './salones-api.service';

/**
 * Data facade: list loading, refresh, detail, stats, filters, pagination.
 * Shares HorariosStore with sibling facades.
 */
@Injectable({ providedIn: 'root' })
export class HorariosDataFacade {
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
   * Cargar todos los horarios y opciones de filtros.
   * Profesores: carga solo sus horarios (sin paginación server-side).
   * Admins: carga paginado con todas las opciones de filtros.
   */
  loadAll(): void {
    if (this.store.loading()) return;
    this.store.setLoading(true);
    this.store.setOptionsLoading(true);
    this.store.clearError();

    const profesorId = this.store.currentProfesorId();

    if (profesorId !== null) {
      this.loadAllForProfesor(profesorId);
    } else {
      this.loadAllForAdmin();
    }
  }

  /**
   * Cargar horarios por salón
   */
  loadBySalon(salonId: number): void {
    if (this.store.loading()) return;
    this.store.setLoading(true);
    this.store.setFiltroSalon(salonId);

    this.api
      .getBySalon(salonId)
      .pipe(
        withRetry({ tag: 'HorariosDataFacade:loadBySalon' }),
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
    if (this.store.loading()) return;
    this.store.setLoading(true);
    this.store.setFiltroProfesor(profesorId);

    this.api
      .getByProfesor(profesorId)
      .pipe(
        withRetry({ tag: 'HorariosDataFacade:loadByProfesor' }),
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
    if (this.store.detailLoading()) return;
    this.store.setDetailLoading(true);
    this.store.openDetailDrawer();

    this.api
      .getById(id)
      .pipe(
        withRetry({ tag: 'HorariosDataFacade:loadDetalle' }),
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
  // #region Refetch y estadísticas

  /**
   * Refetch solo items (sin resetear skeletons ni opciones).
   * Profesores: refetch por su profesorId.
   * Admins: refetch paginado.
   */
  refreshHorariosOnly(): void {
    this.store.setLoading(true);
    const profesorId = this.store.currentProfesorId();

    if (profesorId !== null) {
      this.api
        .getByProfesor(profesorId)
        .pipe(
          withRetry({ tag: 'HorariosDataFacade:refreshHorariosOnly' }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (horarios) => {
            this.store.setHorarios(horarios);
            this.store.setPaginationData(1, horarios.length, horarios.length);
            this.calculateEstadisticas(horarios);
            this.store.setLoading(false);
          },
          error: (err) => this.handleRefreshError(err),
        });
    } else {
      this.api
        .getAllPaginated(this.store.page(), this.store.pageSize())
        .pipe(
          withRetry({ tag: 'HorariosDataFacade:refreshHorariosOnly' }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.store.setHorarios(response.data);
            this.store.setPaginationData(response.page, response.pageSize, response.total);
            this.calculateEstadisticas(response.data);
            this.store.setLoading(false);
          },
          error: (err) => this.handleRefreshError(err),
        });
    }
  }

  /**
   * Calcular estadísticas desde los datos
   */
  calculateEstadisticas(horarios: { estado: boolean; profesorId: number | null }[]): void {
    const stats = {
      totalHorarios: horarios.length,
      horariosActivos: horarios.filter((h) => h.estado).length,
      horariosInactivos: horarios.filter((h) => !h.estado).length,
      horariosConProfesor: horarios.filter((h) => h.profesorId !== null).length,
      horariosSinProfesor: horarios.filter((h) => h.profesorId === null).length,
    };
    this.store.setEstadisticas(stats);
  }

  // #endregion
  // #region Helpers privados

  private loadAllForAdmin(): void {
    const page = this.store.page();
    const pageSize = this.store.pageSize();

    forkJoin({
      horarios: this.api.getAllPaginated(page, pageSize),
      salones: this.salonesApi.listar(),
      cursos: this.cursosApi.listar(),
      profesores: this.profesoresApi.listar(),
    })
      .pipe(
        withRetry({ tag: 'HorariosDataFacade:loadAll' }),
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

  private loadAllForProfesor(profesorId: number): void {
    forkJoin({
      horarios: this.api.getByProfesor(profesorId),
      salones: this.salonesApi.listar(),
      cursos: this.cursosApi.listar(),
    })
      .pipe(
        withRetry({ tag: 'HorariosDataFacade:loadAllProfesor' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ horarios, salones, cursos }) => {
          this.store.setHorarios(horarios);
          this.store.setPaginationData(1, horarios.length, horarios.length);
          this.store.setSalonesDisponibles(salones);
          this.store.setCursosDisponibles(cursos);
          this.calculateEstadisticas(horarios);
          this.store.setLoading(false);
          this.store.setOptionsLoading(false);
          this.store.setStatsReady(true);
          this.store.setTableReady(true);
        },
        error: (err) => {
          logger.error('Error al cargar horarios del profesor:', err);
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

  private handleRefreshError(err: unknown): void {
    logger.error('Error al refrescar horarios:', err);
    this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
    this.store.setLoading(false);
  }

  // #endregion
}
