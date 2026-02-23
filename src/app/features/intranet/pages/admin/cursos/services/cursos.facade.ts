import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { CursosService, Curso } from '@core/services/cursos';
import { GradosService } from '@core/services/grados/grados.service';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { CursosStore } from './cursos.store';

@Injectable({ providedIn: 'root' })
export class CursosFacade {
	// #region Dependencias
	private api = inject(CursosService);
	private gradosApi = inject(GradosService);
	private store = inject(CursosStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos CRUD

	/** Carga inicial: estadísticas + grados + primera página en paralelo */
	loadAll(): void {
		this.store.setLoading(true);

		forkJoin({
			cursos: this.api.getCursosPaginated(1, this.store.pageSize()),
			stats: this.api.getEstadisticas(),
			grados: this.gradosApi.getGrados(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ cursos, stats, grados }) => {
					this.store.setCursos(cursos.data);
					this.store.setPaginationData(cursos.page, cursos.pageSize, cursos.total);
					this.store.setEstadisticas(stats);
					this.store.setGrados(grados);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.loadCursos);
					this.store.setLoading(false);
				},
			});
	}

	/** Cambio de página desde p-table lazy load */
	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshCursosOnly();
	}

	/**
	 * CREAR: Refetch items only (necesita ID del servidor) + refetch stats
	 */
	create(nombre: string, gradosIds: number[]): void {
		this.store.setLoading(true);

		this.api
			.crearCurso({ nombre, gradosIds })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.closeDialog();
					this.refreshCursosOnly();
					this.refreshEstadisticas();
				},
				error: (err) => {
					logger.error('Error al crear curso:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.saveCurso);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * EDITAR: Mutación quirúrgica (no refetch)
	 */
	update(id: number, nombre: string, estado: boolean, gradosIds: number[]): void {
		this.store.setLoading(true);

		this.api
			.actualizarCurso(id, { nombre, estado, gradosIds })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.updateCurso(id, {
						nombre,
						estado,
						grados: this.store.selectedGradosFull(),
					});
					this.store.closeDialog();
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al actualizar curso:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.saveCurso);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * TOGGLE: Mutación quirúrgica + stats incrementales
	 */
	toggleEstado(curso: Curso): void {
		this.store.setLoading(true);

		this.api
			.actualizarCurso(curso.id, {
				nombre: curso.nombre,
				estado: !curso.estado,
				gradosIds: curso.grados?.map((g) => g.id) || [],
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.toggleCursoEstado(curso.id);

					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', -1);
						this.store.incrementarEstadistica('cursosInactivos', 1);
					} else {
						this.store.incrementarEstadistica('cursosActivos', 1);
						this.store.incrementarEstadistica('cursosInactivos', -1);
					}

					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.changeEstado,
					);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * ELIMINAR: Mutación quirúrgica + stats incrementales
	 */
	delete(curso: Curso): void {
		this.store.setLoading(true);

		this.api
			.eliminarCurso(curso.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.removeCurso(curso.id);
					this.store.incrementarEstadistica('totalCursos', -1);

					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', -1);
					} else {
						this.store.incrementarEstadistica('cursosInactivos', -1);
					}

					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al eliminar curso:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.deleteCurso);
					this.store.setLoading(false);
				},
			});
	}

	// #endregion

	// #region Comandos de UI

	openNewDialog(): void {
		this.store.closeDialog();
		this.store.openDialog();
	}

	openEditDialog(curso: Curso): void {
		this.store.setSelectedCurso(curso);
		this.store.setFormData({ nombre: curso.nombre, estado: curso.estado ?? true });
		this.store.setIsEditing(true);

		// Split grado IDs by level
		const gradosIds = curso.grados?.map((g) => g.id) || [];
		const inicialIds = this.store.gradosInicial().map((g) => g.id);
		const primariaIds = this.store.gradosPrimaria().map((g) => g.id);
		const secundariaIds = this.store.gradosSecundaria().map((g) => g.id);

		this.store.setGradeSelections(
			gradosIds.filter((id) => inicialIds.includes(id)),
			gradosIds.filter((id) => primariaIds.includes(id)),
			gradosIds.filter((id) => secundariaIds.includes(id)),
		);

		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	saveCurso(): void {
		const formData = this.store.formData();
		const gradosIds = this.store.allGradosIds();

		if (this.store.isEditing()) {
			const curso = this.store.selectedCurso();
			if (!curso) return;
			this.update(curso.id, formData.nombre, formData.estado, gradosIds);
		} else {
			this.create(formData.nombre, gradosIds);
		}
	}

	showGrados(curso: Curso): void {
		this.store.openGradosDialog(curso);
	}

	closeGradosDialog(): void {
		this.store.closeGradosDialog();
	}

	openConfirmDialog(): void {
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}

	// #endregion

	// #region Comandos de formulario
	updateFormField(field: 'nombre' | 'estado', value: unknown): void {
		this.store.updateFormField(field, value);
	}

	addGrado(gradoId: number): void {
		this.store.addGrado(gradoId);
	}

	removeGrado(gradoId: number): void {
		this.store.removeGrado(gradoId);
	}
	// #endregion

	// #region Comandos de filtros — resetean page y refetch server-side
	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
		this.store.setPage(1);
		this.refreshCursosOnly();
	}

	setFilterEstado(estado: boolean | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.refreshCursosOnly();
	}

	setFilterNivel(nivel: string | null): void {
		this.store.setFilterNivel(nivel);
		this.store.setPage(1);
		this.refreshCursosOnly();
	}

	clearFilters(): void {
		this.store.clearFiltros();
		this.refreshCursosOnly();
	}
	// #endregion

	// #region Helpers privados

	/** Refetch solo la lista paginada con filtros actuales del store */
	private refreshCursosOnly(): void {
		this.store.setLoading(true);

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const search = this.store.searchTerm() || undefined;
		const estado = this.store.filterEstado();
		const nivel = this.store.filterNivel() || undefined;

		this.api
			.getCursosPaginated(page, pageSize, search, estado, nivel)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setCursos(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar cursos:', err);
					this.store.setLoading(false);
				},
			});
	}

	/** Refetch estadísticas desde el servidor */
	private refreshEstadisticas(): void {
		this.api
			.getEstadisticas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => this.store.setEstadisticas(stats),
				error: (err) => logger.error('Error al refrescar estadísticas:', err),
			});
	}
	// #endregion
}
