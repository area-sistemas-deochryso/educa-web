import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '@config';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { DebugService, logger, getEstadoToggleDeltas, getEstadoRollbackDeltas } from '@core/helpers';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { formatFullName } from '@shared/pipes';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	ImportarEstudianteItem,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from '../models';
import { UsersService } from './usuarios.service';
import { UsersStore } from './usuarios.store';
import { UsersDataFacade } from './usuarios-data.facade';

/**
 * Facade for CRUD operations on usuarios.
 * Handles create, update, delete, toggle estado, and bulk import
 * with WAL-based optimistic updates.
 */
@Injectable({ providedIn: 'root' })
export class UsersCrudFacade {
	private usuariosService = inject(UsersService);
	private store = inject(UsersStore);
	private dataFacade = inject(UsersDataFacade);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	private debug = inject(DebugService);
	private log = this.debug.dbg('FACADE:UsuariosCrud');
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/usuarios`;

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
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al eliminar:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.deleteUsuario,
				);
			},
			optimistic: {
				apply: () => {
					this.dataFacade.markCrudMutation();
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(usuario.estado, 'delete');
					this.store.removeUsuario(id);
					this.store.setTotalRecords(this.store.totalRecords() - 1);
					this.store.incrementarEstadistica('totalUsuarios', -1);
					this.store.incrementarEstadistica('usuariosActivos', activosDelta);
					this.store.incrementarEstadistica('usuariosInactivos', inactivosDelta);
					this.updateRolEstadistica(rol, -1);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(usuario.estado, 'delete');
					this.store.addUsuario(usuario);
					this.store.setTotalRecords(this.store.totalRecords() + 1);
					this.store.incrementarEstadistica('totalUsuarios', 1);
					this.store.incrementarEstadistica('usuariosActivos', activosDelta);
					this.store.incrementarEstadistica('usuariosInactivos', inactivosDelta);
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
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al cambiar estado:', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					UI_ADMIN_ERROR_DETAILS.changeEstado,
				);
			},
			optimistic: {
				apply: () => {
					this.dataFacade.markCrudMutation();
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(usuario.estado);
					this.store.toggleEstadoUsuario(id);
					this.store.incrementarEstadistica('usuariosActivos', activosDelta);
					this.store.incrementarEstadistica('usuariosInactivos', inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(usuario.estado);
					this.store.toggleEstadoUsuario(id);
					this.store.incrementarEstadistica('usuariosActivos', activosDelta);
					this.store.incrementarEstadistica('usuariosInactivos', inactivosDelta);
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
						this.store.triggerRefresh();
						this.store.incrementarEstadistica('totalEstudiantes', result.creados);
						this.store.incrementarEstadistica('totalUsuarios', result.creados);
						this.store.incrementarEstadistica('usuariosActivos', result.creados);
					} else if (result.actualizados > 0) {
						this.store.triggerRefresh();
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
				this.store.triggerRefresh();
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
				},
				rollback: () => {},
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
			nombreCompleto: formatFullName(selectedUsuario.apellidos, selectedUsuario.nombres),
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
				this.store.triggerRefresh();
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
					this.dataFacade.markCrudMutation();
					this.store.updateUsuario(id, {
						dni: data.dni!,
						nombreCompleto: formatFullName(data.apellidos!, data.nombres!),
						nombres: data.nombres!,
						apellidos: data.apellidos!,
						correo: data.correo || undefined,
						telefono: data.telefono || undefined,
						estado: data.estado ?? true,
					});
					this.store.closeDialog();
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

	/** Mapeo rol → campo de estadística. Agregar aquí si se crea un nuevo rol. */
	private readonly ROL_STAT_KEY: Record<string, keyof UsuariosEstadisticas> = {
		Director: 'totalDirectores',
		Profesor: 'totalProfesores',
		Estudiante: 'totalEstudiantes',
		Apoderado: 'totalApoderados',
		'Asistente Administrativo': 'totalAsistentesAdministrativos',
	};

	private updateRolEstadistica(rol: string, delta: number): void {
		const key = this.ROL_STAT_KEY[rol];
		if (key) {
			this.store.incrementarEstadistica(key, delta);
		}
	}

	// #endregion
}
