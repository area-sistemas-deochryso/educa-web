import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';

@Injectable({ providedIn: 'root' })
export class EmailOutboxDataFacade {
	// #region Dependencias
	private api = inject(EmailOutboxApiService);
	private store = inject(EmailOutboxStore);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de datos
	loadData(): void {
		this.store.setLoading(true);

		const filtros = {
			tipo: this.store.filterTipo() ?? undefined,
			estado: this.store.filterEstado() ?? undefined,
			desde: this.store.filterDesde() ?? undefined,
			hasta: this.store.filterHasta() ?? undefined,
		};

		forkJoin({
			items: this.api.listar(filtros),
			stats: this.api.estadisticas(filtros.desde, filtros.hasta),
			tendencias: this.api.tendencias(filtros.desde, filtros.hasta),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items, stats, tendencias }) => {
					this.store.setItems(items);
					this.store.setEstadisticas(stats);
					this.store.setTendencias(tendencias);
					this.store.setStatsReady(true);
					this.store.setTableReady(true);
					this.store.setTendenciasReady(true);
					this.store.setLoading(false);
				},
				error: () => {
					this.store.setLoading(false);
					this.store.setStatsReady(true);
					this.store.setTableReady(true);
					this.store.setTendenciasReady(true);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}
	// #endregion

	// #region Filtros
	onSearchChange(term: string): void {
		this.store.setSearchTerm(term);
	}

	onFilterTipoChange(tipo: string | null): void {
		this.store.setFilterTipo(tipo as ReturnType<typeof this.store.filterTipo>);
		this.loadData();
	}

	onFilterEstadoChange(estado: string | null): void {
		this.store.setFilterEstado(estado as ReturnType<typeof this.store.filterEstado>);
		this.loadData();
	}

	onFilterTipoFalloChange(tipoFallo: string | null): void {
		this.store.setFilterTipoFallo(tipoFallo);
	}

	onFilterDesdeChange(desde: string | null): void {
		this.store.setFilterDesde(desde);
		this.loadData();
	}

	onFilterHastaChange(hasta: string | null): void {
		this.store.setFilterHasta(hasta);
		this.loadData();
	}
	// #endregion
}
