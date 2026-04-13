// #region Imports
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import {
	ActualizarEstadoReporteRequest,
	FeedbackReportService,
	ReporteEstado,
	ReporteUsuarioListaDto,
} from '@core/services/feedback';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';

import { FeedbackReportsStore } from './feedback-reports.store';

// #endregion
// #region Implementation
/**
 * Facade de la página admin de reportes.
 * - Carga estadísticas + listado en paralelo.
 * - Gestiona drawer de detalle.
 * - Aplica cambio de estado con mutación quirúrgica (no refetch completo).
 */
@Injectable({ providedIn: 'root' })
export class FeedbackReportsFacade {
	private readonly service = inject(FeedbackReportService);
	private readonly store = inject(FeedbackReportsStore);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/reportes-usuario`;

	readonly vm = this.store.vm;

	// #region Carga inicial
	loadAll(): void {
		this.loadEstadisticas();
		this.loadItems();
	}

	loadEstadisticas(): void {
		this.service
			.obtenerEstadisticas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => {
					this.store.setEstadisticas(stats);
					this.store.setStatsReady(true);
				},
				error: (err) => {
					logger.error('[FeedbackReportsFacade] Error cargando estadísticas', err);
					this.store.setStatsReady(true);
				},
			});
	}

	loadItems(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);
		const s = this.store;
		this.service
			.listar({
				tipo: s.filterTipo(),
				estado: s.filterEstado(),
				desde: this.toIso(s.filterDesde()),
				hasta: this.toIso(s.filterHasta()),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
				error: (err) => {
					logger.error('[FeedbackReportsFacade] Error cargando listado', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});
	}
	// #endregion

	// #region Filtros
	setFilterTipo(tipo: string | null): void {
		this.store.setFilterTipo(tipo);
		this.loadItems();
	}

	setFilterEstado(estado: string | null): void {
		this.store.setFilterEstado(estado);
		this.loadItems();
	}

	setFilterDesde(desde: Date | null): void {
		this.store.setFilterDesde(desde);
		this.loadItems();
	}

	setFilterHasta(hasta: Date | null): void {
		this.store.setFilterHasta(hasta);
		this.loadItems();
	}

	clearFilters(): void {
		this.store.clearFilters();
		this.loadItems();
	}
	// #endregion

	// #region Drawer
	openDetalle(item: ReporteUsuarioListaDto): void {
		this.store.openDrawer(item);
		this.store.setDetalleLoading(true);
		this.service
			.obtenerDetalle(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detalle) => {
					this.store.setDetalle(detalle);
					this.store.setDetalleLoading(false);
				},
				error: (err) => {
					logger.error('[FeedbackReportsFacade] Error cargando detalle', err);
					this.store.setDetalleLoading(false);
				},
			});
	}

	closeDetalle(): void {
		this.store.closeDrawer();
	}
	// #endregion

	// #region Cambio de estado
	cambiarEstado(estado: ReporteEstado, observacion: string | null): void {
		const detalle = this.store.detalle();
		if (!detalle) return;
		if (this.store.estadoUpdating()) return;

		const reporteId = detalle.id;
		const estadoPrevio = detalle.estado;
		const snapshot = detalle;

		const payload: ActualizarEstadoReporteRequest = {
			estado,
			observacion,
			rowVersion: detalle.rowVersion,
		};

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'reporte-usuario',
			resourceId: reporteId,
			endpoint: `${this.apiUrl}/${reporteId}/estado`,
			method: 'PATCH',
			payload,
			http$: () => this.service.actualizarEstado(reporteId, payload),
			optimistic: {
				apply: () => {
					this.store.setEstadoUpdating(true);
					this.store.updateItemEstado(reporteId, estado);
					this.store.setDetalle({ ...snapshot, estado });
				},
				rollback: () => {
					this.store.updateItemEstado(reporteId, estadoPrevio);
					this.store.setDetalle(snapshot);
					this.store.setEstadoUpdating(false);
				},
			},
			onCommit: () => {
				// Recargamos detalle para refrescar rowVersion y auditoría (campos
				// derivados del server que no podemos conocer sin consultar).
				this.service
					.obtenerDetalle(reporteId)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe({
						next: (d) => this.store.setDetalle(d),
						error: () => { /* ignoramos: el listado ya está actualizado */ },
					});
				this.store.setEstadoUpdating(false);
				this.loadEstadisticas();
			},
			onError: (err) => {
				logger.error('[FeedbackReportsFacade] Error cambiando estado', err);
			},
		});
	}
	// #endregion

	// #region Helpers
	private toIso(date: Date | null): string | null {
		if (!date) return null;
		return date.toISOString();
	}
	// #endregion
}
// #endregion
