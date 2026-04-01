import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, getEstadoToggleDeltas } from '@core/helpers';
import { ErrorHandlerService, SwService } from '@core/services';
import {
	EventoCalendarioLista,
	CrearEventoCalendarioRequest,
	ActualizarEventoCalendarioRequest,
} from '@data/models';
import { EventosCalendarioService } from './eventos-calendario.service';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { EventosCalendarioStore, EventoFormData } from './eventos-calendario.store';

@Injectable({ providedIn: 'root' })
export class EventosCalendarioFacade {
	// #region Dependencias
	private api = inject(EventosCalendarioService);
	private store = inject(EventosCalendarioStore);
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
			.pipe(withRetry({ tag: 'EventosCalendarioFacade:loadAll' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items, stats }) => {
					this.store.setItems(Array.isArray(items) ? items : items.data ?? []);
					this.store.setEstadisticas(stats);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar eventos:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudieron cargar los eventos');
					this.store.setError('No se pudieron cargar los eventos');
					this.store.setLoading(false);
				},
			});
	}

	create(): void {
		const formData = this.store.formData();
		const payload: CrearEventoCalendarioRequest = this.buildCreatePayload(formData);

		this.api
			.crear(payload)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.closeDialog();
					this.silentRefreshAfterCrud();
					this.store.incrementarEstadistica('total', 1);
					this.store.incrementarEstadistica(formData.estado ? 'activos' : 'inactivos', 1);
				},
				error: (err) => {
					logger.error('Error al crear evento:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo crear el evento');
					this.store.setLoading(false);
				},
			});
	}

	update(): void {
		const selected = this.store.selectedItem();
		if (!selected) return;

		const formData = this.store.formData();
		const payload: ActualizarEventoCalendarioRequest = {
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
						descripcion: formData.descripcion,
						tipo: formData.tipo,
						icono: formData.icono,
						fechaInicio: formData.fechaInicio,
						fechaFin: formData.fechaFin || null,
						hora: formData.hora || null,
						ubicacion: formData.ubicacion || null,
						estado: formData.estado,
						anio: formData.anio,
					});
					this.store.closeDialog();
					this.silentRefreshAfterCrud();
				},
				error: (err) => {
					logger.error('Error al actualizar evento:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo actualizar el evento');
					this.store.setLoading(false);
				},
			});
	}

	toggleEstado(item: EventoCalendarioLista): void {
		this.api
			.toggleEstado(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado);
					this.store.toggleItemEstado(item.id);
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo cambiar el estado');
				},
			});
	}

	delete(item: EventoCalendarioLista): void {
		this.api
			.eliminar(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(item.estado, 'delete');
					this.store.removeItem(item.id);
					this.store.incrementarEstadistica('total', -1);
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
				error: (err) => {
					logger.error('Error al eliminar evento:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo eliminar el evento');
				},
			});
	}

	// #endregion

	// #region Comandos de UI

	openNewDialog(): void {
		this.store.closeDialog();
		this.store.openDialog();
	}

	openEditDialog(item: EventoCalendarioLista): void {
		this.store.setSelectedItem(item);
		this.store.setIsEditing(true);
		this.store.setFormData({
			titulo: item.titulo,
			descripcion: item.descripcion,
			tipo: item.tipo,
			icono: item.icono,
			fechaInicio: item.fechaInicio.substring(0, 10),
			fechaFin: item.fechaFin ? item.fechaFin.substring(0, 10) : '',
			hora: item.hora ?? '',
			ubicacion: item.ubicacion ?? '',
			estado: item.estado,
			anio: item.anio,
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
		this.swService.invalidateCacheByPattern('/eventoscalendario').then(() => {
			this.loadAll();
		});
	}

	// #endregion

	// #region Helpers privados

	/** Refetch silencioso post-CRUD: el interceptor ya invalidó el cache del SW. */
	private silentRefreshAfterCrud(): void {
		this.refreshItemsOnly();
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

	private buildCreatePayload(formData: EventoFormData): CrearEventoCalendarioRequest {
		return {
			titulo: formData.titulo.trim(),
			descripcion: formData.descripcion.trim(),
			tipo: formData.tipo,
			icono: formData.icono,
			fechaInicio: formData.fechaInicio,
			fechaFin: formData.fechaFin?.trim() || undefined,
			hora: formData.hora?.trim() || undefined,
			ubicacion: formData.ubicacion?.trim() || undefined,
			estado: formData.estado,
			anio: formData.anio,
		};
	}

	// #endregion
}
