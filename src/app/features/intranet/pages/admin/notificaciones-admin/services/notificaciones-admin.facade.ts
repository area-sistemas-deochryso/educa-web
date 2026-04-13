import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, getEstadoToggleDeltas, getEstadoRollbackDeltas } from '@core/helpers';
import { ErrorHandlerService, SwService, WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';
import {
	NotificacionLista,
	CrearNotificacionRequest,
	ActualizarNotificacionRequest,
} from '@data/models';
import { NotificacionesAdminService } from './notificaciones-admin.service';
import { UI_SUMMARIES } from '@app/shared/constants';

import { NotificacionesAdminStore, NotificacionFormData } from './notificaciones-admin.store';

const RESOURCE = 'notificaciones-admin';
const API_BASE = `${environment.apiUrl}/api/sistema/notificaciones/admin`;

@Injectable({ providedIn: 'root' })
export class NotificacionesAdminFacade {
	// #region Dependencias
	private api = inject(NotificacionesAdminService);
	private store = inject(NotificacionesAdminStore);
	private swService = inject(SwService);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos CRUD

	loadAll(): void {
		const anio = this.store.filterAnio();
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			items: this.api.listar(anio),
			stats: this.api.getEstadisticas(anio),
		})
			.pipe(withRetry({ tag: 'NotificacionesAdminFacade:loadAll' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items, stats }) => {
					this.store.setItems(Array.isArray(items) ? items : items.data ?? []);
					this.store.setEstadisticas(stats);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar notificaciones:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudieron cargar las notificaciones');
					this.store.setError('No se pudieron cargar las notificaciones');
					this.store.setLoading(false);
				},
			});
	}

	create(): void {
		const formData = this.store.formData();
		const payload = this.buildCreatePayload(formData);
		const estadoNuevo = formData.estado;

		this.wal.execute({
			operation: 'CREATE',
			resourceType: RESOURCE,
			endpoint: `${API_BASE}/crear`,
			method: 'POST',
			payload,
			http$: () => this.api.crear(payload),
			optimistic: {
				apply: () => {
					this.store.closeDialog();
					this.store.incrementarEstadistica('total', 1);
					this.store.incrementarEstadistica(estadoNuevo ? 'activas' : 'inactivas', 1);
				},
				rollback: () => {
					this.store.incrementarEstadistica('total', -1);
					this.store.incrementarEstadistica(estadoNuevo ? 'activas' : 'inactivas', -1);
				},
			},
			onCommit: () => this.refreshItemsOnly(),
			onError: (err) => {
				logger.error('Error al crear notificación:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo crear la notificación');
			},
		});
	}

	update(): void {
		const selected = this.store.selectedItem();
		if (!selected) return;

		const formData = this.store.formData();
		const payload: ActualizarNotificacionRequest = {
			...this.buildCreatePayload(formData),
			rowVersion: selected.rowVersion,
		};

		const snapshot: Partial<NotificacionLista> = {
			titulo: selected.titulo,
			mensaje: selected.mensaje,
			tipo: selected.tipo,
			prioridad: selected.prioridad,
			icono: selected.icono,
			fechaInicio: selected.fechaInicio,
			fechaFin: selected.fechaFin,
			actionUrl: selected.actionUrl,
			actionText: selected.actionText,
			dismissible: selected.dismissible,
			estado: selected.estado,
			anio: selected.anio,
			destinatarioRol: selected.destinatarioRol,
			destinatarioGrado: selected.destinatarioGrado,
			destinatarioSeccion: selected.destinatarioSeccion,
		};

		const optimisticUpdate: Partial<NotificacionLista> = {
			titulo: formData.titulo,
			mensaje: formData.mensaje,
			tipo: formData.tipo,
			prioridad: formData.prioridad,
			icono: formData.icono,
			fechaInicio: formData.fechaInicio,
			fechaFin: formData.fechaFin,
			actionUrl: formData.actionUrl || null,
			actionText: formData.actionText || null,
			dismissible: formData.dismissible,
			estado: formData.estado,
			anio: formData.anio,
			destinatarioRol: formData.destinatarioRol || null,
			destinatarioGrado: formData.destinatarioGrado || null,
			destinatarioSeccion: formData.destinatarioSeccion || null,
		};

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: RESOURCE,
			resourceId: selected.id,
			endpoint: `${API_BASE}/${selected.id}/actualizar`,
			method: 'PUT',
			payload,
			http$: () => this.api.actualizar(selected.id, payload),
			optimistic: {
				apply: () => {
					this.store.updateItem(selected.id, optimisticUpdate);
					if (selected.estado !== formData.estado) {
						const delta = formData.estado ? 1 : -1;
						this.store.incrementarEstadistica('activas', delta);
						this.store.incrementarEstadistica('inactivas', -delta);
					}
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.updateItem(selected.id, snapshot);
					if (selected.estado !== formData.estado) {
						const delta = formData.estado ? -1 : 1;
						this.store.incrementarEstadistica('activas', delta);
						this.store.incrementarEstadistica('inactivas', -delta);
					}
				},
			},
			onCommit: () => this.refreshItemsOnly(),
			onError: (err) => {
				logger.error('Error al actualizar notificación:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo actualizar la notificación');
			},
		});
	}

	toggleEstado(item: NotificacionLista): void {
		this.wal.execute({
			operation: 'TOGGLE',
			resourceType: RESOURCE,
			resourceId: item.id,
			endpoint: `${API_BASE}/${item.id}/toggle`,
			method: 'PATCH',
			payload: {},
			http$: () => this.api.toggleEstado(item.id),
			optimistic: {
				apply: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado);
					this.store.toggleItemEstado(item.id);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(item.estado);
					this.store.toggleItemEstado(item.id);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al cambiar estado:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo cambiar el estado');
			},
		});
	}

	delete(item: NotificacionLista): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: RESOURCE,
			resourceId: item.id,
			endpoint: `${API_BASE}/${item.id}/eliminar`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminar(item.id),
			optimistic: {
				apply: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete');
					this.store.removeItem(item.id);
					this.store.incrementarEstadistica('total', -1);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(item.estado, 'delete');
					this.store.addItem(item);
					this.store.incrementarEstadistica('total', 1);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al eliminar notificación:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo eliminar la notificación');
			},
		});
	}

	// #endregion

	// #region Comandos de UI

	openNewDialog(): void {
		this.store.closeDialog();
		this.store.openDialog();
	}

	openEditDialog(item: NotificacionLista): void {
		this.store.setSelectedItem(item);
		this.store.setIsEditing(true);
		this.store.setFormData({
			titulo: item.titulo,
			mensaje: item.mensaje,
			tipo: item.tipo,
			prioridad: item.prioridad,
			icono: item.icono,
			fechaInicio: item.fechaInicio.substring(0, 10),
			fechaFin: item.fechaFin.substring(0, 10),
			actionUrl: item.actionUrl ?? '',
			actionText: item.actionText ?? '',
			dismissible: item.dismissible,
			estado: item.estado,
			anio: item.anio,
			destinatarioRol: item.destinatarioRol,
			destinatarioGrado: item.destinatarioGrado,
			destinatarioSeccion: item.destinatarioSeccion,
		});
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	openConfirmDialog(): void {
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}

	changeAnio(anio: number): void {
		this.store.setFilterAnio(anio);
		this.loadAll();
	}

	/** Refresh manual (botón Actualizar): invalida cache SW + recarga completa. */
	refresh(): void {
		this.swService.invalidateCacheByPattern('/notificaciones').then(() => {
			this.loadAll();
		});
	}

	// #endregion

	// #region Helpers privados

	/** Refetch silencioso post-CRUD: el interceptor ya invalidó el cache del SW. */
	private refreshItemsOnly(): void {
		const anio = this.store.filterAnio();
		this.api
			.listar(anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.store.setItems(Array.isArray(response) ? response : response.data ?? []);
				},
				error: (err) => {
					logger.error('Error al refrescar lista:', err);
				},
			});
	}

	private buildCreatePayload(formData: NotificacionFormData): CrearNotificacionRequest {
		return {
			titulo: formData.titulo.trim(),
			mensaje: formData.mensaje.trim(),
			tipo: formData.tipo,
			prioridad: formData.prioridad,
			icono: formData.icono,
			fechaInicio: formData.fechaInicio,
			fechaFin: formData.fechaFin,
			actionUrl: formData.actionUrl?.trim() || undefined,
			actionText: formData.actionText?.trim() || undefined,
			dismissible: formData.dismissible,
			estado: formData.estado,
			anio: formData.anio,
			destinatarioRol: formData.destinatarioRol || null,
			destinatarioGrado: formData.destinatarioGrado || null,
			destinatarioSeccion: formData.destinatarioSeccion || null,
		};
	}

	// #endregion
}
