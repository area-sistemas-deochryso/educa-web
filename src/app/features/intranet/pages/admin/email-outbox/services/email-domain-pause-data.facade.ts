import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { WalCrossTabRefetchService } from '@core/services';
import { DomainPauseMotivo } from '@data/models';

import { EmailDomainPauseService } from './email-domain-pause.service';
import { EmailDomainPauseStore } from './email-domain-pause.store';

@Injectable({ providedIn: 'root' })
export class EmailDomainPauseDataFacade {
	private readonly api = inject(EmailDomainPauseService);
	private readonly store = inject(EmailDomainPauseStore);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'email-domain-pause',
			refetchItems: () => this.loadData(),
			destroyRef: this.destroyRef,
		});
	}

	readonly vm = computed(() => ({
		items: this.filteredItems(),
		allItems: this.store.items(),
		loading: this.store.loading(),
		tableReady: this.store.tableReady(),
		searchTerm: this.store.searchTerm(),
		filterMotivo: this.store.filterMotivo(),
		showLiberadas: this.store.showLiberadas(),
		hasActiveFilters: this.store.hasActiveFilters(),
		activeCount: this.store.activeCount(),
		estadisticas: this.store.estadisticas(),
		dialogVisible: this.store.dialogVisible(),
		formData: this.store.formData(),
	}));

	// Filtrado client-side (≤ 50 filas)
	private readonly filteredItems = computed(() => {
		const term = this.store.searchTerm().toLowerCase();
		const motivo = this.store.filterMotivo();
		const showLiberadas = this.store.showLiberadas();
		return this.store.items().filter((i) => {
			if (!showLiberadas && !i.estado) return false;
			if (motivo && i.motivo !== motivo) return false;
			if (term && !i.dominio.toLowerCase().includes(term)) return false;
			return true;
		});
	});

	loadData(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);
		const showLiberadas = this.store.showLiberadas();

		this.api
			.getActivas(!showLiberadas)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					const total = items.length;
					const activas = items.filter((i) => i.estado).length;
					this.store.setEstadisticas({
						total,
						activas,
						liberadas: Math.max(0, total - activas),
					});
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[EmailDomainPauseDataFacade] Error al cargar listado', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}

	onSearchChange(term: string): void {
		this.store.setSearchTerm(term);
	}

	onFilterMotivoChange(motivo: DomainPauseMotivo | null): void {
		this.store.setFilterMotivo(motivo);
	}

	onShowLiberadasChange(show: boolean): void {
		this.store.setShowLiberadas(show);
		this.loadData();
	}

	clearFiltros(): void {
		this.store.clearFiltros();
		this.loadData();
	}

	updateFormDominio(value: string): void {
		this.store.updateFormField('dominio', value);
	}

	updateFormDuration(value: 1 | 6 | 12 | 24): void {
		this.store.updateFormField('durationHours', value);
	}

	updateFormObservacion(value: string): void {
		this.store.updateFormField('observacion', value);
	}
}
