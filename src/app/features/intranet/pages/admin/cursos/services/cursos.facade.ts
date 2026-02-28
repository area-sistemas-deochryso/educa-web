import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { CursosService, Curso } from '@core/services/cursos';
import { GradosService } from '@core/services/grados/grados.service';
import { environment } from '@config';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { CursosStore } from './cursos.store';

@Injectable({ providedIn: 'root' })
export class CursosFacade {
	// #region Dependencias
	private api = inject(CursosService);
	private gradosApi = inject(GradosService);
	private store = inject(CursosStore);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/cursos`;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos CRUD

	/** Carga inicial: estadísticas + grados + primera página en paralelo */
	loadAll(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			cursos: this.api.getCursosPaginated(1, this.store.pageSize()),
			stats: this.api.getEstadisticas(),
			grados: this.gradosApi.getGrados(),
		})
			.pipe(
				withRetry({ tag: 'CursosFacade:loadAll' }),
				takeUntilDestroyed(this.destroyRef),
			)
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
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadCursos);
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
	 * CREAR: WAL → optimistic close dialog → refetch on commit
	 */
	create(nombre: string, gradosIds: number[]): void {
		const payload = { nombre, gradosIds };

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'Curso',
			endpoint: `${this.apiUrl}/crear`,
			method: 'POST',
			payload,
			http$: () => this.api.crearCurso(payload),
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {},
			},
			onCommit: () => {
				this.refreshCursosOnly();
				this.refreshEstadisticas();
			},
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.saveCurso),
		});
	}

	/**
	 * EDITAR: WAL → optimistic update → rollback to snapshot
	 */
	update(id: number, nombre: string, estado: boolean, gradosIds: number[]): void {
		const snapshot = this.store.cursos().find((c) => c.id === id);
		const payload = { nombre, estado, gradosIds, rowVersion: snapshot?.rowVersion };
		const grados = this.store.selectedGradosFull();

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Curso',
			resourceId: id,
			endpoint: `${this.apiUrl}/${id}/actualizar`,
			method: 'PUT',
			payload,
			http$: () => this.api.actualizarCurso(id, payload),
			optimistic: {
				apply: () => {
					this.store.updateCurso(id, { nombre, estado, grados });
					this.store.closeDialog();
				},
				rollback: () => {
					if (snapshot) this.store.updateCurso(id, snapshot);
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.saveCurso),
		});
	}

	/**
	 * TOGGLE: WAL → optimistic toggle + stats → rollback reverses
	 */
	toggleEstado(curso: Curso): void {
		const gradosIds = curso.grados?.map((g) => g.id) || [];
		const payload = { nombre: curso.nombre, estado: !curso.estado, gradosIds, rowVersion: curso.rowVersion };

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Curso',
			resourceId: curso.id,
			endpoint: `${this.apiUrl}/${curso.id}/actualizar`,
			method: 'PUT',
			payload,
			http$: () => this.api.actualizarCurso(curso.id, payload),
			optimistic: {
				apply: () => {
					this.store.toggleCursoEstado(curso.id);
					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', -1);
						this.store.incrementarEstadistica('cursosInactivos', 1);
					} else {
						this.store.incrementarEstadistica('cursosActivos', 1);
						this.store.incrementarEstadistica('cursosInactivos', -1);
					}
				},
				rollback: () => {
					this.store.toggleCursoEstado(curso.id);
					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', 1);
						this.store.incrementarEstadistica('cursosInactivos', -1);
					} else {
						this.store.incrementarEstadistica('cursosActivos', -1);
						this.store.incrementarEstadistica('cursosInactivos', 1);
					}
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.changeEstado),
		});
	}

	/**
	 * ELIMINAR: WAL → optimistic remove + stats → rollback re-adds
	 */
	delete(curso: Curso): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'Curso',
			resourceId: curso.id,
			endpoint: `${this.apiUrl}/${curso.id}/eliminar`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarCurso(curso.id),
			optimistic: {
				apply: () => {
					this.store.removeCurso(curso.id);
					this.store.incrementarEstadistica('totalCursos', -1);
					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', -1);
					} else {
						this.store.incrementarEstadistica('cursosInactivos', -1);
					}
				},
				rollback: () => {
					this.store.addCurso(curso);
					this.store.incrementarEstadistica('totalCursos', 1);
					if (curso.estado) {
						this.store.incrementarEstadistica('cursosActivos', 1);
					} else {
						this.store.incrementarEstadistica('cursosInactivos', 1);
					}
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.deleteCurso),
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

	private handleApiError(detail: string): void {
		this.errorHandler.showError(UI_SUMMARIES.error, detail);
		this.store.setLoading(false);
	}

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
			.pipe(
				withRetry({ tag: 'CursosFacade:refreshCursosOnly' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => {
					this.store.setCursos(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar cursos:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
					this.store.setLoading(false);
				},
			});
	}

	/** Refetch estadísticas desde el servidor */
	private refreshEstadisticas(): void {
		this.api
			.getEstadisticas()
			.pipe(
				withRetry({ tag: 'CursosFacade:refreshEstadisticas' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (stats) => this.store.setEstadisticas(stats),
				error: (err) => {
					logger.error('Error al refrescar estadísticas:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
				},
			});
	}
	// #endregion
}
