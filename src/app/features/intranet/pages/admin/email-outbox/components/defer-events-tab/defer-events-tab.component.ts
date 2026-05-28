import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { DecimalPipe } from '@angular/common';

import { logger } from '@core/helpers';
import {
	DeferEventTipo,
	EmailDeferEventDto,
	EmailDeferEventFiltros,
} from '@data/models';
import { MiniSparklineComponent } from '@intranet-shared/components';
import { UiMappingService } from '@intranet-shared/services';

import { EmailDeferEventsService } from '../../services';
import { trendSummary, TrendSummary } from '../../utils/trend-summary';
import { DeferEventItemComponent } from '../defer-event-item/defer-event-item.component';
import { DomainBlockedAlertBannerComponent } from '../domain-blocked-alert-banner/domain-blocked-alert-banner.component';

interface SelectOption<T> {
	label: string;
	value: T;
}

const PAGE_SIZE = 25;

@Component({
	selector: 'app-defer-events-tab',
	standalone: true,
	imports: [
		DecimalPipe,
		FormsModule,
		ButtonModule,
		DatePickerModule,
		InputTextModule,
		PaginatorModule,
		SelectModule,
		TooltipModule,
		MiniSparklineComponent,
		DeferEventItemComponent,
		DomainBlockedAlertBannerComponent,
	],
	templateUrl: './defer-events-tab.component.html',
	styleUrl: './defer-events-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeferEventsTabComponent implements OnInit {
	private readonly api = inject(EmailDeferEventsService);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	private readonly uiMapping = inject(UiMappingService);

	readonly pageSize = PAGE_SIZE;

	private readonly _tipoOptions = signal<SelectOption<DeferEventTipo>[]>([]);
	private readonly _tipoOptionsLoading = signal(true);
	readonly tipoOptions = this._tipoOptions.asReadonly();
	readonly tipoOptionsLoading = this._tipoOptionsLoading.asReadonly();

	private readonly _events = signal<EmailDeferEventDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _page = signal(1);
	private readonly _total = signal(0);
	private readonly _filterTipo = signal<DeferEventTipo | null>(null);
	private readonly _filterDominio = signal<string>('');
	private readonly _filterDesde = signal<Date | null>(null);
	private readonly _filterHasta = signal<Date | null>(null);

	readonly events = this._events.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly page = this._page.asReadonly();
	readonly total = this._total.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterDominio = this._filterDominio.asReadonly();
	readonly filterDesde = this._filterDesde.asReadonly();
	readonly filterHasta = this._filterHasta.asReadonly();

	private readonly _trend = signal<readonly number[]>([]);
	private readonly _trendLoading = signal(false);
	readonly trend = this._trend.asReadonly();
	readonly trendLoading = this._trendLoading.asReadonly();
	readonly trendSummaryValue = computed<TrendSummary>(() => trendSummary(this._trend()));
	readonly trendTotal = computed(() => this._trend().reduce((a, b) => a + b, 0));
	readonly hasTrend = computed(() => this._trend().length > 0);

	readonly first = computed(() => (this._page() - 1) * PAGE_SIZE);
	readonly hasEvents = computed(() => this._events().length > 0);

	ngOnInit(): void {
		this.loadCatalogoTipos();
		this.loadTrend();

		// Cross-link from defer-fail widget: ?desde=hoy&tipo=<tipo>
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const desde = params.get('desde');
				const tipo = params.get('tipo');
				if (desde === 'hoy') {
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					this._filterDesde.set(today);
				}
				if (tipo) {
					// String libre — el BE valida; si es desconocido, devuelve tabla vacía.
					this._filterTipo.set(tipo);
				}
				this.loadData();
			});
	}

	private loadTrend(): void {
		this._trendLoading.set(true);
		this.api
			.getTrend()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this._trend.set(data);
					this._trendLoading.set(false);
				},
				error: () => {
					this._trendLoading.set(false);
				},
			});
	}

	private loadCatalogoTipos(): void {
		this.api
			.getCatalogoTipos()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (tipos) => {
					this._tipoOptions.set(
						tipos.map((t) => ({
							label: this.uiMapping.getDeferEventTipoLabel(t),
							value: t,
						})),
					);
					this._tipoOptionsLoading.set(false);
				},
				error: (err) => {
					logger.error('[DeferEventsTab] Error loading catálogo tipos', err);
					// Fallback: dropdown vacío. El filtro tipo es string libre, sigue
					// funcionando vía URL (?tipo=...). Ver brief 117b.
					this._tipoOptions.set([]);
					this._tipoOptionsLoading.set(false);
				},
			});
	}

	private getFiltros(): EmailDeferEventFiltros {
		return {
			desde: this._filterDesde()?.toISOString() ?? null,
			hasta: this._filterHasta()?.toISOString() ?? null,
			tipo: this._filterTipo(),
			dominio: this._filterDominio() || null,
		};
	}

	loadData(): void {
		if (this._loading()) return;
		this._loading.set(true);

		this.api
			.getPaginado(this.getFiltros(), this._page(), PAGE_SIZE)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this._events.set(result.data);
					this._total.set(result.total);
					this._loading.set(false);
				},
				error: (err) => {
					logger.error('[DeferEventsTab] Error', err);
					this._loading.set(false);
				},
			});
	}

	onTipoChange(value: DeferEventTipo | null): void {
		this._filterTipo.set(value);
		this._page.set(1);
		this.loadData();
	}

	onDominioChange(value: string): void {
		this._filterDominio.set(value);
	}

	onDominioApply(): void {
		this._page.set(1);
		this.loadData();
	}

	onDesdeChange(value: Date | null): void {
		this._filterDesde.set(value);
		this._page.set(1);
		this.loadData();
	}

	onHastaChange(value: Date | null): void {
		this._filterHasta.set(value);
		this._page.set(1);
		this.loadData();
	}

	onClearFilters(): void {
		this._filterTipo.set(null);
		this._filterDominio.set('');
		this._filterDesde.set(null);
		this._filterHasta.set(null);
		this._page.set(1);
		this.loadData();
	}

	onRefresh(): void {
		this.loadData();
	}

	onPageChange(event: PaginatorState): void {
		const first = event.first ?? 0;
		const newPage = Math.floor(first / PAGE_SIZE) + 1;
		if (newPage === this._page()) return;
		this._page.set(newPage);
		this.loadData();
	}

	onExportCsv(): void {
		const rows = [
			[
				'id',
				'fecha',
				'tipo',
				'destinatario',
				'dominio',
				'statusCode',
				'diagnosticCode',
				'emailOutboxId',
				'correlationId',
			].join(','),
			...this._events().map((e) =>
				[
					e.id,
					e.fecha,
					e.tipo,
					e.destinatario ?? '',
					e.dominio ?? '',
					e.statusCode ?? '',
					(e.diagnosticCode ?? '').replace(/[\r\n,]/g, ' '),
					e.emailOutboxId ?? '',
					e.correlationId ?? '',
				]
					.map((v) => `"${String(v).replace(/"/g, '""')}"`)
					.join(','),
			),
		];
		const csv = rows.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `defer-events-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
