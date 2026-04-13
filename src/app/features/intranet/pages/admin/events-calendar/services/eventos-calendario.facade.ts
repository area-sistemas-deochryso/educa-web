import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry, getEstadoToggleDeltas, getEstadoRollbackDeltas } from '@core/helpers';
import { ErrorHandlerService, SwService, WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';
import {
	EventoCalendarioLista,
	CrearEventoCalendarioRequest,
	ActualizarEventoCalendarioRequest,
} from '@data/models';
import { EventsCalendarService } from './eventos-calendario.service';
import { UI_SUMMARIES } from '@app/shared/constants';

import { EventsCalendarStore, EventoFormData } from './eventos-calendario.store';

const RESOURCE = 'eventos-calendario';
const API_BASE = `${environment.apiUrl}/api/sistema/eventoscalendario/admin`;

@Injectable({ providedIn: 'root' })
export class EventsCalendarFacade {
	// #region Dependencias
	private api = inject(EventsCalendarService);
	private store = inject(EventsCalendarStore);
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
					this.store.incrementarEstadistica(estadoNuevo ? 'activos' : 'inactivos', 1);
				},
				rollback: () => {
					this.store.incrementarEstadistica('total', -1);
					this.store.incrementarEstadistica(estadoNuevo ? 'activos' : 'inactivos', -1);
				},
			},
			onCommit: () => this.refreshItemsOnly(),
			onError: (err) => {
				logger.error('Error al crear evento:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo crear el evento');
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

		const snapshot: Partial<EventoCalendarioLista> = {
			titulo: selected.titulo,
			descripcion: selected.descripcion,
			tipo: selected.tipo,
			icono: selected.icono,
			fechaInicio: selected.fechaInicio,
			fechaFin: selected.fechaFin,
			hora: selected.hora,
			ubicacion: selected.ubicacion,
			estado: selected.estado,
			anio: selected.anio,
		};

		const optimisticUpdate: Partial<EventoCalendarioLista> = {
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
						this.store.incrementarEstadistica('activos', delta);
						this.store.incrementarEstadistica('inactivos', -delta);
					}
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.updateItem(selected.id, snapshot);
					if (selected.estado !== formData.estado) {
						const delta = formData.estado ? -1 : 1;
						this.store.incrementarEstadistica('activos', delta);
						this.store.incrementarEstadistica('inactivos', -delta);
					}
				},
			},
			onCommit: () => this.refreshItemsOnly(),
			onError: (err) => {
				logger.error('Error al actualizar evento:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo actualizar el evento');
			},
		});
	}

	toggleEstado(item: EventoCalendarioLista): void {
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
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(item.estado);
					this.store.toggleItemEstado(item.id);
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al cambiar estado:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo cambiar el estado');
			},
		});
	}

	delete(item: EventoCalendarioLista): void {
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
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(item.estado, 'delete');
					this.store.addItem(item);
					this.store.incrementarEstadistica('total', 1);
					this.store.incrementarEstadistica('activos', activosDelta);
					this.store.incrementarEstadistica('inactivos', inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => {
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
