import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, getEstadoToggleDeltas } from '@core/helpers';
import { ErrorHandlerService, SwService } from '@core/services';
import {
	NotificacionLista,
	CrearNotificacionRequest,
	ActualizarNotificacionRequest,
} from '@data/models';
import { NotificacionesAdminService } from './notificaciones-admin.service';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { NotificacionesAdminStore, NotificacionFormData } from './notificaciones-admin.store';

@Injectable({ providedIn: 'root' })
export class NotificacionesAdminFacade {
	// #region Dependencias
	private api = inject(NotificacionesAdminService);
	private store = inject(NotificacionesAdminStore);
	private swService = inject(SwService);
	private errorHandler = inject(ErrorHandlerService);
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
		const payload: CrearNotificacionRequest = this.buildCreatePayload(formData);

		this.api
			.crear(payload)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.closeDialog();
					this.silentRefreshAfterCrud();
					this.store.incrementarEstadistica('total', 1);
					if (formData.estado) this.store.incrementarEstadistica('activas', 1);
					else this.store.incrementarEstadistica('inactivas', 1);
				},
				error: (err) => {
					logger.error('Error al crear notificación:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo crear la notificación');
					this.store.setLoading(false);
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

		this.api
			.actualizar(selected.id, payload)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.updateItem(selected.id, {
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
					});
					this.store.closeDialog();
					this.silentRefreshAfterCrud();
				},
				error: (err) => {
					logger.error('Error al actualizar notificación:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo actualizar la notificación');
					this.store.setLoading(false);
				},
			});
	}

	toggleEstado(item: NotificacionLista): void {
		this.api
			.toggleEstado(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado);
					this.store.toggleItemEstado(item.id);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo cambiar el estado');
				},
			});
	}

	delete(item: NotificacionLista): void {
		this.api
			.eliminar(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete');
					this.store.removeItem(item.id);
					this.store.incrementarEstadistica('total', -1);
					this.store.incrementarEstadistica('activas', activosDelta);
					this.store.incrementarEstadistica('inactivas', inactivosDelta);
				},
				error: (err) => {
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

	/** Refetch silencioso post-CRUD: invalida cache SW + refresh sin loading visible. */
	private silentRefreshAfterCrud(): void {
		this.swService.invalidateCacheByPattern('/notificaciones').then(() => {
			this.refreshItemsOnly();
		});
	}

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
