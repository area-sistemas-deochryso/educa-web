import {
	ActualizarUsuarioRequest,
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
import { of } from 'rxjs';

import { UsuariosStore } from './usuarios.store';
import { logger } from '@core/helpers';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Facade para gestión de usuarios
 * Orquesta la lógica de negocio entre servicios y store
 */
@Injectable({ providedIn: 'root' })
export class UsuariosFacade {
	private usuariosService = inject(UsuariosService);
	private store = inject(UsuariosStore);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);

	// Expone ViewModel del store
	readonly vm = this.store.vm;

	constructor() {
		this.setupCacheRefresh();
	}

	// ============ Data Loading ============

	loadData(): void {
		// Inicializar estados de skeleton
		this.store.setShowSkeletons(true);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.store.setLoading(true);

		// Renderizado progresivo:
		// 1. Cargar estadísticas primero (más pequeñas, más rápidas)
		// 2. Luego cargar usuarios (más grandes)

		// Paso 1: Cargar estadísticas
		this.usuariosService
			.obtenerEstadisticas()
			.pipe(
				catchError((err) => {
					logger.error('Error cargando estadísticas:', err);
					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((estadisticas) => {
				if (estadisticas) {
					this.store.setEstadisticas(estadisticas);
				}
				// Marcar stats como listas y ocultar su skeleton
				this.store.setStatsReady(true);

				// Paso 2: Cargar usuarios (renderizado progresivo)
				this.usuariosService
					.listarUsuarios()
					.pipe(
						catchError((err) => {
							logger.error('Error cargando usuarios:', err);
							this.errorHandler.showError('Error', 'No se pudieron cargar los usuarios');
							return of([] as UsuarioLista[]);
						}),
						takeUntilDestroyed(this.destroyRef),
					)
					.subscribe((usuarios) => {
						// Filtrar apoderados para no mostrarlos en admin
						this.store.setUsuarios(usuarios.filter((u) => u.rol !== 'Apoderado'));
						this.store.setTableReady(true);
						this.store.setLoading(false);

						// Ocultar todos los skeletons después de un pequeño delay
						// para asegurar que el contenido está renderizado
						setTimeout(() => {
							this.store.setShowSkeletons(false);
						}, 50);
					});
			});
	}

	refresh(): void {
		this.loadData();
	}

	// ============ Filters ============

	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
	}

	setFilterRol(rol: string | null): void {
		this.store.setFilterRol(rol as RolUsuarioAdmin | null);
	}

	setFilterEstado(estado: boolean | null): void {
		this.store.setFilterEstado(estado);
	}

	clearFilters(): void {
		this.store.clearFilters();
	}

	// ============ Detail View ============

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

	// ============ Confirm Dialog ===============

	openConfirmDialog(): void {
		this.store.openConfirmDialogVisible();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialogVisible();
	}

	// ============ Dialog Management ============

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

	// ============ Form Management ============

	updateFormField(field: string, value: unknown): void {
		this.store.updateFormData({ [field]: value });
	}

	// ============ CRUD Operations ============

	saveUsuario(): void {
		const data = this.store.formData();
		const isEditing = this.store.isEditing();
		const selectedUsuario = this.store.selectedUsuario();

		this.store.setLoading(true);

		const operation$ = isEditing
			? this.buildUpdateRequest(data, selectedUsuario)
			: this.buildCreateRequest(data);

		if (!operation$) {
			this.store.setLoading(false);
			return;
		}

		operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.store.closeDialog();
				this.loadData();
			},
			error: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError('Error', 'No se pudo guardar el usuario');
				this.store.setLoading(false);
			},
		});
	}

	deleteUsuario(usuario: UsuarioLista): void {
		this.store.setLoading(true);
		this.usuariosService
			.eliminarUsuario(usuario.rol, usuario.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadData(),
				error: (err) => {
					logger.error('Error al eliminar:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el usuario');
					this.store.setLoading(false);
				},
			});
	}

	toggleEstado(usuario: UsuarioLista): void {
		this.store.setLoading(true);
		this.usuariosService
			.cambiarEstado(usuario.rol, usuario.id, !usuario.estado)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadData(),
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError('Error', 'No se pudo cambiar el estado');
					this.store.setLoading(false);
				},
			});
	}

	// ============ Private Helpers ============

	private buildCreateRequest(data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>) {
		if (!data.rol || !data.contrasena) return null;

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
			correoApoderado: data.correoApoderado,
		};

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
			correoApoderado: data.correoApoderado,
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
				const usuarios = (event.data as UsuarioLista[]).filter(
					(u) => u.rol !== 'Apoderado',
				);
				this.store.setUsuarios(usuarios);
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
}
