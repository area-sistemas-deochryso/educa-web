import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '@config';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { DebugService, logger } from '@core/helpers';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	ImportarEstudianteItem,
	UsuarioDetalle,
	UsuarioLista,
} from './usuarios.models';
import { UsuariosService } from './usuarios.service';
import { UsuariosStore } from './usuarios.store';

/**
 * Facade for CRUD operations on usuarios.
 * Handles create, update, delete, toggle estado, and bulk import
 * with WAL-based optimistic updates.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosCrudFacade {
	private usuariosService = inject(UsuariosService);
	private store = inject(UsuariosStore);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	private debug = inject(DebugService);
	private log = this.debug.dbg('FACADE:UsuariosCrud');
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/usuarios`;

	/**
	 * Callback invoked after a successful CREATE commit.
	 * Set by UsuariosDataFacade to trigger refreshUsuariosOnly without circular dependency.
	 */
	onCreateCommit: (() => void) | null = null;

	/**
	 * Callback invoked after a successful import that requires refresh.
	 * Set by UsuariosDataFacade.
	 */
	onImportSuccess: (() => void) | null = null;

	// #region CRUD Operations

	/**
	 * CREAR: Optimistic close + WAL -> refetch en commit (necesitamos ID del servidor).
	 * EDITAR: Optimistic quirurgico + WAL -> mutacion local sin refetch (ya tenemos ID y campos).
	 */
	saveUsuario(): void {
		const data = this.store.formData();
		const isEditing = this.store.isEditing();
		const selectedUsuario = this.store.selectedUsuario();

		if (isEditing) {
			this.updateUsuario(data, selectedUsuario);
		} else {
			this.createUsuario(data);
		}
	}

	/** ELIMINAR: Optimistic remove + stats incrementales + WAL. Sin refetch. */
	deleteUsuario(usuario: UsuarioLista): void {
		const rol = usuario.rol;
		const id = usuario.id;
		const endpoint = `${this.apiUrl}/${encodeURIComponent(rol)}/${id}`;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'usuarios',
			resourceId: id,
			endpoint,
			method: 'DELETE',
			payload: null,
			http$: () => this.usuariosService.eliminarUsuario(rol, id),
			onCommit: () => {
				this.store.setLoading(false);
			},
			onError: (err) => {
				logger.error('Error al eliminar:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.deleteUsuario,
				);
				this.store.setLoading(false);
			},
			optimistic: {
				apply: () => {
					this.store.removeUsuario(id);
					this.store.setTotalRecords(this.store.totalRecords() - 1);
					this.store.incrementarEstadistica('totalUsuarios', -1);
					if (usuario.estado) {
						this.store.incrementarEstadistica('usuariosActivos', -1);
					} else {
						this.store.incrementarEstadistica('usuariosInactivos', -1);
					}
					this.updateRolEstadistica(rol, -1);
					this.store.setLoading(true);
				},
				rollback: () => {
					this.store.addUsuario(usuario);
					this.store.setTotalRecords(this.store.totalRecords() + 1);
					this.store.incrementarEstadistica('totalUsuarios', 1);
					if (usuario.estado) {
						this.store.incrementarEstadistica('usuariosActivos', 1);
					} else {
						this.store.incrementarEstadistica('usuariosInactivos', 1);
					}
					this.updateRolEstadistica(rol, 1);
				},
			},
		});
	}

	/** TOGGLE: Optimistic flip + stats incrementales + WAL. Sin refetch. */
	toggleEstado(usuario: UsuarioLista): void {
		const nuevoEstado = !usuario.estado;
		const rol = usuario.rol;
		const id = usuario.id;
		const endpoint = `${this.apiUrl}/${encodeURIComponent(rol)}/${id}/estado`;

		this.wal.execute({
			operation: 'TOGGLE',
			resourceType: 'usuarios',
			resourceId: id,
			endpoint,
			method: 'PATCH',
			payload: { estado: nuevoEstado },
			http$: () => this.usuariosService.cambiarEstado(rol, id, nuevoEstado),
			onCommit: () => {
				this.store.setLoading(false);
			},
			onError: (err) => {
				logger.error('Error al cambiar estado:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.changeEstado,
				);
				this.store.setLoading(false);
			},
			optimistic: {
				apply: () => {
					this.store.toggleEstadoUsuario(id);
					if (nuevoEstado) {
						this.store.incrementarEstadistica('usuariosActivos', 1);
						this.store.incrementarEstadistica('usuariosInactivos', -1);
					} else {
						this.store.incrementarEstadistica('usuariosActivos', -1);
						this.store.incrementarEstadistica('usuariosInactivos', 1);
					}
					this.store.setLoading(true);
				},
				rollback: () => {
					this.store.toggleEstadoUsuario(id);
					if (nuevoEstado) {
						this.store.incrementarEstadistica('usuariosActivos', -1);
						this.store.incrementarEstadistica('usuariosInactivos', 1);
					} else {
						this.store.incrementarEstadistica('usuariosActivos', 1);
						this.store.incrementarEstadistica('usuariosInactivos', -1);
					}
				},
			},
		});
	}

	// #endregion
	// #region Import

	importarEstudiantes(filas: ImportarEstudianteItem[]): void {
		this.store.setImportLoading(true);
		this.usuariosService
			.importarEstudiantes(filas)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setImportResult(result);
					this.store.setImportLoading(false);
					if (result.creados > 0) {
						this.onImportSuccess?.();
						this.store.incrementarEstadistica('totalEstudiantes', result.creados);
						this.store.incrementarEstadistica('totalUsuarios', result.creados);
						this.store.incrementarEstadistica('usuariosActivos', result.creados);
					} else if (result.actualizados > 0) {
						this.onImportSuccess?.();
					}
				},
				error: (err) => {
					logger.error('Error importando estudiantes:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo completar la importacion');
					this.store.setImportLoading(false);
				},
			});
	}

	// #endregion
	// #region Private Helpers

	private createUsuario(data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>): void {
		const payload = this.buildCreatePayload(data);
		if (!payload) return;

		const endpoint = `${this.apiUrl}/crear`;

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'usuarios',
			endpoint,
			method: 'POST',
			payload,
			http$: () => this.usuariosService.crearUsuario(payload),
			onCommit: () => {
				this.onCreateCommit?.();
				this.store.incrementarEstadistica('totalUsuarios', 1);
				this.store.incrementarEstadistica('usuariosActivos', 1);
				this.updateRolEstadistica(data.rol!, 1);
			},
			onError: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.createUsuario,
				);
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

	private updateUsuario(
		data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>,
		selectedUsuario: UsuarioDetalle | null,
	): void {
		const payload = this.buildUpdatePayload(data, selectedUsuario);
		if (!payload || !selectedUsuario) return;

		const rol = selectedUsuario.rol;
		const id = selectedUsuario.id;
		const endpoint = `${this.apiUrl}/${encodeURIComponent(rol)}/${id}`;

		// Snapshot para rollback
		const previousData: Partial<UsuarioLista> = {
			dni: selectedUsuario.dni,
			nombreCompleto: `${selectedUsuario.nombres} ${selectedUsuario.apellidos}`,
			nombres: selectedUsuario.nombres,
			apellidos: selectedUsuario.apellidos,
			correo: selectedUsuario.correo,
			telefono: selectedUsuario.telefono,
			estado: selectedUsuario.estado,
		};

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'usuarios',
			resourceId: id,
			endpoint,
			method: 'PUT',
			payload,
			http$: () => this.usuariosService.actualizarUsuario(rol, id, payload),
			onCommit: () => {
				this.store.setLoading(false);
			},
			onError: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.updateUsuario,
				);
				this.store.setLoading(false);
			},
			optimistic: {
				apply: () => {
					this.store.updateUsuario(id, {
						dni: data.dni!,
						nombreCompleto: `${data.nombres!} ${data.apellidos!}`,
						nombres: data.nombres!,
						apellidos: data.apellidos!,
						correo: data.correo || undefined,
						telefono: data.telefono || undefined,
						estado: data.estado ?? true,
					});
					this.store.closeDialog();
					this.store.setLoading(true);
				},
				rollback: () => {
					this.store.updateUsuario(id, previousData);
				},
			},
		});
	}

	/**
	 * Construye el payload para crear usuario.
	 * Retorna null si faltan campos requeridos.
	 */
	private buildCreatePayload(
		data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>,
	): CrearUsuarioRequest | null {
		this.log.info('buildCreatePayload - data recibida', { data });

		if (!data.rol || !data.contrasena) {
			this.log.warn('buildCreatePayload - falta rol o contrasena', {
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
			nombreApoderado: data.nombreApoderado,
			telefonoApoderado: data.telefonoApoderado,
			correoApoderado: data.correoApoderado,
			salonId: data.salonId,
			esTutor: data.esTutor,
		};

		this.log.info('buildCreatePayload - request a enviar', { request });
		return request;
	}

	/**
	 * Construye el payload para actualizar usuario.
	 * Retorna null si no hay usuario seleccionado.
	 */
	private buildUpdatePayload(
		data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>,
		usuario: UsuarioDetalle | null,
	): ActualizarUsuarioRequest | null {
		if (!usuario) return null;

		return {
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
			nombreApoderado: data.nombreApoderado,
			telefonoApoderado: data.telefonoApoderado,
			correoApoderado: data.correoApoderado,
			salonId: data.salonId,
			esTutor: data.esTutor,
			rowVersion: usuario?.rowVersion,
		};
	}

	/** Actualizar estadistica por rol (DRY helper) */
	private updateRolEstadistica(rol: string, delta: number): void {
		if (rol === 'Director') {
			this.store.incrementarEstadistica('totalDirectores', delta);
		} else if (rol === 'Profesor') {
			this.store.incrementarEstadistica('totalProfesores', delta);
		} else if (rol === 'Estudiante') {
			this.store.incrementarEstadistica('totalEstudiantes', delta);
		} else if (rol === 'Asistente Administrativo') {
			this.store.incrementarEstadistica('totalAsistentesAdministrativos', delta);
		}
	}

	// #endregion
}
