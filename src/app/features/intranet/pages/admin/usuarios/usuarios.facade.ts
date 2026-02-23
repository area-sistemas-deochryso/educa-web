import {
	ActualizarUsuarioRequest,
	AsistenciaService,
	CrearUsuarioRequest,
	ErrorHandlerService,
	RolUsuarioAdmin,
	SwService,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
	UsuariosService,
} from '@core/services';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { catchError, filter } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import { UsuariosStore } from './usuarios.store';
import { DebugService, logger } from '@core/helpers';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

/**
 * Facade para gestión de usuarios
 * Orquesta la lógica de negocio entre servicios y store
 */
@Injectable({ providedIn: 'root' })
export class UsuariosFacade {
	private usuariosService = inject(UsuariosService);
	private asistenciaService = inject(AsistenciaService);
	private store = inject(UsuariosStore);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);
	private debug = inject(DebugService);
	private log = this.debug.dbg('FACADE:Usuarios');

	// Expone ViewModel del store
	readonly vm = this.store.vm;

	constructor() {
		this.setupCacheRefresh();
	}

	// #region Data Loading

	loadData(): void {
		this.store.setShowSkeletons(true);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.store.setLoading(true);

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const rol = this.store.filterRol() ?? undefined;
		const estado = this.store.filterEstado() ?? undefined;

		// Ejecutar las 3 llamadas en paralelo para evitar carga en 3 tiempos
		forkJoin({
			estadisticas: this.usuariosService.obtenerEstadisticas().pipe(
				catchError((err) => {
					logger.error('Error cargando estadísticas:', err);
					return of(null);
				}),
			),
			salones: this.asistenciaService.getSalonesDirector().pipe(
				catchError((err) => {
					logger.error('Error cargando salones:', err);
					return of([]);
				}),
			),
			usuarios: this.usuariosService.listarUsuariosPaginado(page, pageSize, rol, estado).pipe(
				catchError((err) => {
					logger.error('Error cargando usuarios:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
					return of({
						data: [] as UsuarioLista[],
						total: 0,
						page,
						pageSize,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
			),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ estadisticas, salones, usuarios }) => {
				if (estadisticas) {
					this.store.setEstadisticas(estadisticas);
				}
				this.store.setStatsReady(true);

				this.store.setSalones(salones);

				this.store.setUsuarios(usuarios.data);
				this.store.setPaginationData(usuarios.page, usuarios.pageSize, usuarios.total);
				this.store.setTableReady(true);
				this.store.setLoading(false);

				setTimeout(() => {
					this.store.setShowSkeletons(false);
				}, 50);
			});
	}

	refresh(): void {
		this.loadData();
	}

	/**
	 * Cargar una página específica (llamado desde onLazyLoad de p-table)
	 */
	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshUsuariosOnly();
	}

	/**
	 * Refresh solo la lista de usuarios paginada (sin resetear skeletons ni estadísticas)
	 * Útil para cuando se crea un usuario y necesitamos el ID del servidor
	 */
	private refreshUsuariosOnly(): void {
		this.store.setLoading(true);

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const rol = this.store.filterRol() ?? undefined;
		const estado = this.store.filterEstado() ?? undefined;

		this.usuariosService
			.listarUsuariosPaginado(page, pageSize, rol, estado)
			.pipe(
				catchError((err) => {
					logger.error('Error cargando usuarios:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
					return of({
						data: [] as UsuarioLista[],
						total: 0,
						page,
						pageSize,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.store.setUsuarios(result.data);
				this.store.setPaginationData(result.page, result.pageSize, result.total);
				this.store.setLoading(false);
			});
	}

	// #endregion
	// #region Filters

	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
	}

	setFilterRol(rol: string | null): void {
		this.store.setFilterRol(rol as RolUsuarioAdmin | null);
		this.store.setPage(1);
		this.refreshUsuariosOnly();
	}

	setFilterEstado(estado: boolean | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.refreshUsuariosOnly();
	}

	clearFilters(): void {
		this.store.clearFilters();
		this.refreshUsuariosOnly();
	}

	// #endregion
	// #region Detail View

	openDetail(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((detalle) => {
				if (detalle) {
					this.store.openDetailDrawer(detalle);
				}
			});
	}

	closeDetail(): void {
		this.store.closeDetailDrawer();
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
	// #region Dialog Management

	openNew(): void {
		this.store.openNewDialog();
	}

	editUsuario(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((detalle) => {
				if (detalle) {
					this.store.openEditDialog(detalle);
				}
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
	// #region Form Management

	updateFormField(field: string, value: unknown): void {
		this.store.updateFormData({ [field]: value });
	}

	// #endregion
	// #region CRUD Operations

	saveUsuario(): void {
		const data = this.store.formData();
		const isEditing = this.store.isEditing();
		const selectedUsuario = this.store.selectedUsuario();

		this.store.setLoading(true);

		if (isEditing) {
			// EDITAR: Actualización quirúrgica (no refetch)
			const operation$ = this.buildUpdateRequest(data, selectedUsuario);
			if (!operation$) {
				this.store.setLoading(false);
				return;
			}

			operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
				next: () => {
					// Mutación quirúrgica: actualizar solo el usuario editado
					if (selectedUsuario) {
						this.store.updateUsuario(selectedUsuario.id, {
							dni: data.dni!,
							nombreCompleto: `${data.nombres!} ${data.apellidos!}`,
							nombres: data.nombres!,
							apellidos: data.apellidos!,
							correo: data.correo || undefined,
							telefono: data.telefono || undefined,
							estado: data.estado ?? true,
						});
					}
					this.store.closeDialog();
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.updateUsuario,
					);
					this.store.setLoading(false);
				},
			});
		} else {
			// CREAR: Necesitamos refetch para obtener el ID del servidor
			const operation$ = this.buildCreateRequest(data);
			if (!operation$) {
				this.store.setLoading(false);
				return;
			}

			operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
				next: () => {
					this.store.closeDialog();
					// Refetch solo usuarios (mantiene estadísticas y sin resetear skeletons)
					this.refreshUsuariosOnly();
					// Incrementar estadísticas localmente
					this.store.incrementarEstadistica('totalUsuarios', 1);
					// Usuario nuevo siempre está activo
					this.store.incrementarEstadistica('usuariosActivos', 1);

					if (data.rol === 'Director') {
						this.store.incrementarEstadistica('totalDirectores', 1);
					} else if (data.rol === 'Profesor') {
						this.store.incrementarEstadistica('totalProfesores', 1);
					} else if (data.rol === 'Estudiante') {
						this.store.incrementarEstadistica('totalEstudiantes', 1);
					} else if (data.rol === 'Asistente Administrativo') {
						this.store.incrementarEstadistica('totalAsistentesAdministrativos', 1);
					}
				},
				error: (err) => {
					logger.error('Error:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.createUsuario,
					);
					this.store.setLoading(false);
				},
			});
		}
	}

	deleteUsuario(usuario: UsuarioLista): void {
		this.store.setLoading(true);
		this.usuariosService
			.eliminarUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					// Mutación quirúrgica: eliminar solo el usuario del array
					this.store.removeUsuario(usuario.id);
					this.store.setTotalRecords(this.store.totalRecords() - 1);

					// Actualizar estadísticas incrementalmente
					this.store.incrementarEstadistica('totalUsuarios', -1);
					if (usuario.estado) {
						this.store.incrementarEstadistica('usuariosActivos', -1);
						this.store.incrementarEstadistica('usuariosInactivos', 1);
					} else {
						this.store.incrementarEstadistica('usuariosInactivos', -1);
					}
					if (usuario.rol === 'Director') {
						this.store.incrementarEstadistica('totalDirectores', -1);
					} else if (usuario.rol === 'Profesor') {
						this.store.incrementarEstadistica('totalProfesores', -1);
					} else if (usuario.rol === 'Estudiante') {
						this.store.incrementarEstadistica('totalEstudiantes', -1);
					} else if (usuario.rol === 'Asistente Administrativo') {
						this.store.incrementarEstadistica('totalAsistentesAdministrativos', -1);
					}

					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al eliminar:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.deleteUsuario,
					);
					this.store.setLoading(false);
				},
			});
	}

	toggleEstado(usuario: UsuarioLista): void {
		this.store.setLoading(true);
		const nuevoEstado = !usuario.estado;

		this.usuariosService
			.cambiarEstado(usuario.rol, usuario.id, nuevoEstado)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					// Mutación quirúrgica: toggle solo el estado del usuario
					this.store.toggleEstadoUsuario(usuario.id);

					// Actualizar estadísticas incrementalmente
					if (nuevoEstado) {
						// Se activó: +1 activo, -1 inactivo
						this.store.incrementarEstadistica('usuariosActivos', 1);
						this.store.incrementarEstadistica('usuariosInactivos', -1);
					} else {
						// Se desactivó: -1 activo, +1 inactivo
						this.store.incrementarEstadistica('usuariosActivos', -1);
						this.store.incrementarEstadistica('usuariosInactivos', 1);
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

	// #endregion
	// #region Private Helpers

	private buildCreateRequest(data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>) {
		this.log.info('buildCreateRequest - data recibida', { data });

		if (!data.rol || !data.contrasena) {
			this.log.warn('buildCreateRequest - falta rol o contraseña', {
				rol: data.rol,
				contrasena: data.contrasena,
			});
			return null;
		}

		const request: CrearUsuarioRequest = {
			dni: data.dni!,
			nombres: data.nombres!,
			apellidos: data.apellidos!,
			contrasena: data.contrasena,
			rol: data.rol,
			telefono: data.telefono,
			correo: data.correo,
			sedeId: data.sedeId,
			fechaNacimiento: data.fechaNacimiento,
			grado: data.grado,
			seccion: data.seccion,
			// Campos para Estudiante (apoderado)
			nombreApoderado: data.nombreApoderado,
			telefonoApoderado: data.telefonoApoderado,
			correoApoderado: data.correoApoderado,
			// Campos para Profesor
			salonId: data.salonId,
			esTutor: data.esTutor,
		};

		this.log.info('buildCreateRequest - request a enviar', { request });
		return this.usuariosService.crearUsuario(request);
	}

	private buildUpdateRequest(
		data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>,
		usuario: UsuarioDetalle | null,
	) {
		if (!usuario) return null;

		const request: ActualizarUsuarioRequest = {
			dni: data.dni!,
			nombres: data.nombres!,
			apellidos: data.apellidos!,
			contrasena: data.contrasena || undefined,
			estado: data.estado ?? true,
			telefono: data.telefono,
			correo: data.correo,
			sedeId: data.sedeId,
			fechaNacimiento: data.fechaNacimiento,
			grado: data.grado,
			seccion: data.seccion,
			// Campos para Estudiante (apoderado)
			nombreApoderado: data.nombreApoderado,
			telefonoApoderado: data.telefonoApoderado,
			correoApoderado: data.correoApoderado,
			// Campos para Profesor
			salonId: data.salonId,
			esTutor: data.esTutor,
		};

		return this.usuariosService.actualizarUsuario(usuario.rol, usuario.id, request);
	}

	/** Auto-refresh cuando el SW detecta datos nuevos del servidor */
	private setupCacheRefresh(): void {
		// Actualizar lista de usuarios directamente desde el evento (sin nuevo fetch)
		this.swService.cacheUpdated$
			.pipe(
				filter(
					(event) =>
						event.url.includes('/usuarios') && !event.url.includes('estadisticas'),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosFacade] Lista usuarios actualizada desde SW');
				const data = event.data;

				// Handle both paginated and non-paginated responses from SW cache
				if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
					const paginated = data as { data: UsuarioLista[]; total: number; page: number; pageSize: number };
					this.store.setUsuarios(paginated.data);
					this.store.setPaginationData(paginated.page, paginated.pageSize, paginated.total);
				} else {
					this.store.setUsuarios(data as UsuarioLista[]);
				}
			});

		// Actualizar estadísticas directamente desde el evento
		this.swService.cacheUpdated$
			.pipe(
				filter((event) => event.url.includes('/usuarios/estadisticas')),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosFacade] Estadísticas actualizadas desde SW');
				this.store.setEstadisticas(event.data as UsuariosEstadisticas);
			});
	}
	// #endregion
}
