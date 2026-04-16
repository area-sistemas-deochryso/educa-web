import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ErrorHandlerService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { APP_USER_ROLES } from '@shared/constants';
import { resolveModoAsignacion } from '@data/models';
import { UsuarioDetalle, UsuarioLista } from '../models';
import { UsersService } from './usuarios.service';
import { UsersStore } from './usuarios.store';
import { ProfesorCursoApiService } from '@features/intranet/pages/admin/schedules/services/profesor-curso-api.service';
import { CursosApiService } from '@features/intranet/pages/admin/schedules/services/cursos-api.service';
import type { CursoListaDto } from '@features/intranet/pages/admin/schedules/models/curso.interface';
import type { ProfesorCursoListaDto } from '@data/models';

/**
 * Facade for UI state: dialogs, drawers, detail views, and form field updates.
 * Thin orchestration layer between user interactions and store commands.
 */
@Injectable({ providedIn: 'root' })
export class UsersUiFacade {
	private usuariosService = inject(UsersService);
	private profesorCursoApi = inject(ProfesorCursoApiService);
	private cursosApi = inject(CursosApiService);
	private store = inject(UsersStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);

	// #region Detail View

	openDetail(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(
				withRetry({ tag: 'UsuariosUiFacade:openDetail' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (detalle) => {
					if (detalle) {
						this.store.openDetailDrawer(detalle);
					}
				},
				error: (err) => {
					logger.error('Error al cargar detalle de usuario:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
				},
			});
	}

	closeDetail(): void {
		this.store.closeDetailDrawer();
	}

	// #endregion
	// #region Dialog Management

	openNew(): void {
		this.store.openNewDialog();
	}

	editUsuario(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(
				withRetry({ tag: 'UsuariosUiFacade:editUsuario' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (detalle) => {
					if (detalle) {
						this.store.openEditDialog(detalle);
						this.loadProfesorCursosIfNeeded(detalle);
					}
				},
				error: (err) => {
					logger.error('Error al cargar datos para edicion:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
				},
			});
	}

	editFromDetail(): void {
		const usuario = this.store.selectedUsuario();
		if (usuario) {
			this.store.closeDetailDrawer();
			this.store.openEditDialog(usuario);
		}
	}

	hideDialog(): void {
		this.store.closeDialog();
	}

	// #endregion
	// #region Confirm Dialog

	openConfirmDialog(): void {
		this.store.openConfirmDialogVisible();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialogVisible();
	}

	// #endregion
	// #region Import Dialog

	openImportDialog(): void {
		this.store.openImportDialog();
	}

	closeImportDialog(): void {
		this.store.closeImportDialog();
	}

	// #endregion
	// #region Form Management

	updateFormField(field: string, value: unknown): void {
		this.store.updateFormDataWithPolicies({ [field]: value });
	}

	// #endregion
	// #region ProfesorCurso Management

	/** Asigna cursos a un profesor (batch, idempotente). */
	asignarCursos(profesorId: number, cursoIds: number[]): void {
		if (cursoIds.length === 0) return;

		const anio = new Date().getFullYear();
		this.store.setProfesorCursosLoading(true);

		this.profesorCursoApi
			.asignar({ profesorId, cursoIds, anio })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					// Reconciliar: agregar los nuevos sin duplicar
					const current = this.store.profesorCursos();
					const existingIds = new Set(current.map((c) => c.cursoId));
					const nuevos = result.filter((r) => !existingIds.has(r.cursoId));
					this.store.setProfesorCursos([...current, ...nuevos]);
					this.store.setProfesorCursosLoading(false);
				},
				error: (err) => {
					logger.error('Error al asignar cursos:', err);
					this.errorHandler.showError('Error', 'No se pudieron asignar los cursos');
					this.store.setProfesorCursosLoading(false);
				},
			});
	}

	/** Desasigna un curso de un profesor (soft-delete). */
	desasignarCurso(profesorCursoId: number): void {
		this.store.setProfesorCursosLoading(true);

		this.profesorCursoApi
			.desasignar(profesorCursoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					const updated = this.store.profesorCursos().filter((c) => c.id !== profesorCursoId);
					this.store.setProfesorCursos(updated);
					this.store.setProfesorCursosLoading(false);
				},
				error: (err) => {
					logger.error('Error al desasignar curso:', err);
					this.errorHandler.showError('Error', 'No se pudo desasignar el curso');
					this.store.setProfesorCursosLoading(false);
				},
			});
	}

	// #endregion
	// #region Private Helpers

	/**
	 * Carga cursos asignados y disponibles si el profesor tiene
	 * salones en modo PorCurso (GRA_Orden ≥ 8).
	 */
	private loadProfesorCursosIfNeeded(detalle: UsuarioDetalle): void {
		if (detalle.rol !== APP_USER_ROLES.Profesor) {
			this.store.clearProfesorCursos();
			return;
		}

		// Verificar si tiene salones no-TutorPleno (PorCurso o Flexible/Verano)
		const salones = this.store.salones();
		const salonesProfesor = detalle.salones ?? [];
		const tienePorCurso = salonesProfesor.some((sp) => {
			const salon = salones.find((s) => s.salonId === sp.salonId);
			return salon && resolveModoAsignacion(salon.gradoOrden, salon.seccion) !== 'TutorPleno';
		});

		if (!tienePorCurso) {
			this.store.clearProfesorCursos();
			return;
		}

		const anio = new Date().getFullYear();
		this.store.setProfesorCursosLoading(true);

		forkJoin({
			asignados: this.profesorCursoApi.listarPorProfesor(detalle.id, anio).pipe(
				catchError(() => of([] as ProfesorCursoListaDto[])),
			),
			cursos: this.cursosApi.listar().pipe(
				catchError(() => of([] as CursoListaDto[])),
			),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ asignados, cursos }) => {
				this.store.setProfesorCursos(asignados);
				this.store.setCursosDisponibles(cursos);
				this.store.setProfesorCursosLoading(false);
			});
	}

	// #endregion
}
