import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, SwService } from '@core/services';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { CursosApiService } from './cursos-api.service';
import { SchedulesApiService } from './horarios-api.service';
import { SchedulesStore } from './horarios.store';
import type { DiaSemana, HorarioVistaType } from '../models/horario.interface';
import { ProfesoresApiService } from './profesores-api.service';
import { ClassroomsApiService } from './salones-api.service';

/**
 * Data facade: list loading, refresh, detail, stats, filters, pagination.
 * Shares SchedulesStore with sibling facades.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesDataFacade {
  private api = inject(SchedulesApiService);
  private salonesApi = inject(ClassroomsApiService);
  private cursosApi = inject(CursosApiService);
  private profesoresApi = inject(ProfesoresApiService);
  private store = inject(SchedulesStore);
  private swService = inject(SwService);
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
    this.store.filterStore.setFiltroSalon(salonId);

    this.api
      .getBySalon(salonId)
      .pipe(
        withRetry({ tag: 'SchedulesDataFacade:loadBySalon' }),
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
    this.store.filterStore.setFiltroProfesor(profesorId);

    this.api
      .getByProfesor(profesorId)
      .pipe(
        withRetry({ tag: 'SchedulesDataFacade:loadByProfesor' }),
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
    this.store.formStore.openDetailDrawer();

    this.api
      .getById(id)
      .pipe(
        withRetry({ tag: 'SchedulesDataFacade:loadDetalle' }),
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
    this.store.filterStore.setPaginationData(page, pageSize, this.store.filterStore.totalRecords());
    this.refreshHorariosOnly();
  }

  // #endregion
  // #region Comandos de filtros

  setFiltroSalon(salonId: number | null): void {
    this.store.filterStore.setFiltroSalon(salonId);
  }

  setFiltroProfesor(profesorId: number | null): void {
    this.store.filterStore.setFiltroProfesor(profesorId);
  }

  setFiltroDiaSemana(diaSemana: DiaSemana | null): void {
    this.store.filterStore.setFiltroDiaSemana(diaSemana);
  }

  setFiltroEstadoActivo(estadoActivo: boolean | null): void {
    this.store.filterStore.setFiltroEstadoActivo(estadoActivo);
  }

  clearFiltros(): void {
    this.store.filterStore.clearFiltros();
    this.loadAll();
  }

  setVistaActual(vista: HorarioVistaType): void {
    this.store.filterStore.setVistaActual(vista);
  }

  // #endregion
  // #region Refetch y estadísticas

  /** Refresh manual (botón Actualizar): invalida cache SW + recarga completa. */
  refresh(): void {
    this.swService.invalidateCacheByPattern('/horario').then(() => {
      this.loadAll();
    });
  }

  /** Refetch silencioso post-CRUD: el interceptor ya invalidó el cache del SW. */
  silentRefreshAfterCrud(): void {
    this.refreshHorariosOnly(true);
  }

  /**
   * Refetch solo items (sin resetear skeletons ni opciones).
   * @param silent - Si true, no muestra loading (para refetch post-CRUD sin interrumpir UX)
   */
  refreshHorariosOnly(silent = false): void {
    if (!silent) {
      this.store.setLoading(true);
    }
    const profesorId = this.store.currentProfesorId();

    if (profesorId !== null) {
      this.api
        .getByProfesor(profesorId)
        .pipe(
          withRetry({ tag: 'SchedulesDataFacade:refreshHorariosOnly' }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (horarios) => {
            this.store.setHorarios(horarios);
            this.store.filterStore.setPaginationData(1, horarios.length, horarios.length);
            this.calculateEstadisticas(horarios);
            if (!silent) { this.store.setLoading(false); }
          },
          error: (err) => this.handleRefreshError(err, silent),
        });
    } else {
      this.api
        .getAllPaginated(this.store.filterStore.page(), this.store.filterStore.pageSize())
        .pipe(
          withRetry({ tag: 'SchedulesDataFacade:refreshHorariosOnly' }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.store.setHorarios(response.data);
            this.store.filterStore.setPaginationData(response.page, response.pageSize, response.total);
            this.calculateEstadisticas(response.data);
            if (!silent) { this.store.setLoading(false); }
          },
          error: (err) => this.handleRefreshError(err, silent),
        });
    }
  }

  /**
   * Calcular estadísticas desde los datos
   */
  private calculateEstadisticas(horarios: { estado: boolean; profesorId: number | null }[]): void {
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
    const page = this.store.filterStore.page();
    const pageSize = this.store.filterStore.pageSize();

    forkJoin({
      horarios: this.api.getAllPaginated(page, pageSize),
      salones: this.salonesApi.listar(),
      cursos: this.cursosApi.listar(),
      profesores: this.profesoresApi.listar(),
    })
      .pipe(
        withRetry({ tag: 'SchedulesDataFacade:loadAll' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ horarios, salones, cursos, profesores }) => {
          this.store.setHorarios(horarios.data);
          this.store.filterStore.setPaginationData(horarios.page, horarios.pageSize, horarios.total);
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
        withRetry({ tag: 'SchedulesDataFacade:loadAllProfesor' }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ horarios, salones, cursos }) => {
          this.store.setHorarios(horarios);
          this.store.filterStore.setPaginationData(1, horarios.length, horarios.length);
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

  private handleRefreshError(err: unknown, silent = false): void {
    logger.error('Error al refrescar horarios:', err);
    this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
    if (!silent) { this.store.setLoading(false); }
  }

  // #endregion
}
