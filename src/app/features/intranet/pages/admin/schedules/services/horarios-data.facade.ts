/* eslint-disable max-lines -- Razón: data facade de horarios cohesivo (carga + filtros + paginación + cross-tab refetch). 302 líneas — 2 sobre el límite por wiring del helper cross-tab. */
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, resolveErrorMessage } from '@core/helpers';
import { ErrorHandlerService, SwService, WalCrossTabRefetchService } from '@core/services';
import {
  UI_ADMIN_ERROR_DETAILS,
  UI_SUMMARIES,
} from '@app/shared/constants';
import { CursosApiService } from './cursos-api.service';
import { SchedulesApiService } from './horarios-api.service';
import { SchedulesStore } from './horarios.store';
import type { DiaSemana, HorarioCompletitudFiltro, HorarioVistaType } from '../models/horario.interface';
import { ProfesorCursoApiService } from './profesor-curso-api.service';
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
  private profesorCursoApi = inject(ProfesorCursoApiService);
  private store = inject(SchedulesStore);
  private swService = inject(SwService);
  private errorHandler = inject(ErrorHandlerService);
  private crossTabRefetch = inject(WalCrossTabRefetchService);
  private destroyRef = inject(DestroyRef);

  // #region Exponer estado del store
  readonly vm = this.store.vm;

  // #endregion

  constructor() {
    this.crossTabRefetch.subscribe({ resourceType: 'horarios', refetchItems: () => this.silentRefreshAfterCrud(), destroyRef: this.destroyRef });
  }

  // #region Comandos de carga

  /**
   * Cargar todos los horarios y opciones de filtros.
   * Profesores: carga solo sus horarios.
   * Admins: carga todos los horarios (sin paginación) con todas las opciones de filtros —
   * la vista agrupa por salón/profesor, por lo que necesita el conjunto completo para ser correcta.
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
          const message = resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadHorariosSalon);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            message
          );
          this.store.setError(message);
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
          const message = resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadHorariosProfesor);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            message
          );
          this.store.setError(message);
          this.store.setLoading(false);
        },
      });
  }

  /**
   * Cargar detalle de un horario.
   * @param force Bypass el guard de reentrancia. Necesario en refrescos post-mutación
   * (asignar/desasignar profesor o estudiantes): si la GET original de apertura del
   * drawer seguía en vuelo, el guard descartaba en silencio el refresh con los datos
   * ya actualizados, dejando el conteo obsoleto hasta un reload manual.
   */
  loadDetalle(id: number, force = false): void {
    if (!force && this.store.detailLoading()) return;
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
            const modo = this.store.optionsStore.resolveModoForSalon(detalle.salonId);
            if (modo === 'PorCurso') {
              this.loadProfesoresCurso(detalle.cursoId, detalle.anio);
            }
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
            resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.horarioDetailLoad)
          );
          this.store.setDetailLoading(false);
          this.store.closeDetailDrawer();
        },
      });
  }

  /**
   * Carga los profesores asignados a un curso (modo PorCurso).
   * Se llama cuando se selecciona un curso en un salón con GRA_Orden >= 8.
   */
  loadProfesoresCurso(cursoId: number, anio: number): void {
    this.profesorCursoApi
      .listarPorCurso(cursoId, anio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profesoresCurso) => this.store.setProfesoresCurso(profesoresCurso),
        error: () => this.store.clearProfesoresCurso(),
      });
  }

  clearProfesoresCurso(): void {
    this.store.clearProfesoresCurso();
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

  setFiltroCompletitud(completitud: HorarioCompletitudFiltro | null): void {
    this.store.filterStore.setFiltroCompletitud(completitud);
  }

  clearFiltros(): void {
    this.store.filterStore.clearFiltros();
    this.loadAll();
  }

  setEsVerano(value: boolean): void {
    this.store.setEsVerano(value);
  }

  setVistaActual(vista: HorarioVistaType): void {
    this.store.filterStore.setVistaActual(vista);
  }

  selectEntity(entityId: number): void {
    this.store.filterStore.selectEntity(entityId);
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
        .getAll()
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
    }
  }

  /**
   * Calcular estadísticas desde los datos
   */
  private calculateEstadisticas(
    horarios: { estado: boolean; profesorId: number | null; cantidadEstudiantes: number }[],
  ): void {
    const stats = {
      totalHorarios: horarios.length,
      horariosActivos: horarios.filter((h) => h.estado).length,
      horariosInactivos: horarios.filter((h) => !h.estado).length,
      horariosConProfesor: horarios.filter((h) => h.profesorId !== null).length,
      horariosSinProfesor: horarios.filter((h) => h.profesorId === null).length,
      horariosSinEstudiantes: horarios.filter((h) => h.cantidadEstudiantes === 0).length,
    };
    this.store.setEstadisticas(stats);
  }

  // #endregion
  // #region Helpers privados

  private loadAllForAdmin(): void {
    forkJoin({
      horarios: this.api.getAll(),
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
          this.store.setHorarios(horarios);
          this.store.filterStore.setPaginationData(1, horarios.length, horarios.length);
          this.store.setSalonesDisponibles(salones);
          this.store.setCursosDisponibles(cursos);
          this.store.setProfesoresDisponibles(profesores);
          this.calculateEstadisticas(horarios);
          this.store.setLoading(false);
          this.store.setOptionsLoading(false);
          this.store.setStatsReady(true);
          this.store.setTableReady(true);
        },
        error: (err) => {
          logger.error('Error al cargar datos:', err);
          const message = resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadHorariosData);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            message
          );
          this.store.setError(message);
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
          const message = resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadHorariosData);
          this.errorHandler.showError(
            UI_SUMMARIES.error,
            message
          );
          this.store.setError(message);
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
