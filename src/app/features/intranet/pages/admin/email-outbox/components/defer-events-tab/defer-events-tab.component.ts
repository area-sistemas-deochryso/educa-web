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

import { DeferEventTipo } from '@data/models';
import { MiniSparklineComponent } from '@intranet-shared/components';

import { HubContextBannerComponent, readHubContext } from '@features/intranet/pages/admin/monitoreo/shared';
import { EmailDeferEventDataFacade } from '../../services';
import { trendSummary, TrendSummary } from '../../utils/trend-summary';
import { DeferEventItemComponent } from '../defer-event-item/defer-event-item.component';
import { DomainBlockedAlertBannerComponent } from '../domain-blocked-alert-banner/domain-blocked-alert-banner.component';

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
		HubContextBannerComponent,
	],
	templateUrl: './defer-events-tab.component.html',
	styleUrl: './defer-events-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeferEventsTabComponent implements OnInit {
	private readonly dataFacade = inject(EmailDeferEventDataFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	readonly pageSize = PAGE_SIZE;
	readonly vm = this.dataFacade.vm;

	readonly trendNumbers = computed(() => this.vm().trend.map((t) => t.count));
	readonly trendSummaryValue = computed<TrendSummary>(() => trendSummary(this.trendNumbers()));
	readonly trendTotal = computed(() => this.trendNumbers().reduce((a, b) => a + b, 0));
	readonly hasTrend = computed(() => this.vm().trend.length > 0);

	readonly hubFiltered = signal(false);
	readonly hubFilterMessage = signal('');

	ngOnInit(): void {
		const hubCtx = readHubContext(this.route);
		if (hubCtx.fromHub && hubCtx.level) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			this.dataFacade.onFilterDesdeChange(today);
			this.hubFiltered.set(true);
			this.hubFilterMessage.set('Filtrado desde el hub — mostrando eventos de hoy');
		}

		this.dataFacade.loadCatalogoTipos();
		this.dataFacade.loadTrend();

		// Cross-link from defer-fail widget: ?desde=hoy&tipo=<tipo>
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const desde = params.get('desde');
				const tipo = params.get('tipo');
				if (desde === 'hoy') {
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					this.dataFacade.onFilterDesdeChange(today);
				}
				if (tipo) {
					// String libre — el BE valida; si es desconocido, devuelve tabla vacía.
					this.dataFacade.onFilterTipoChange(tipo);
				}
				this.dataFacade.loadData();
			});
	}

	onTipoChange(value: DeferEventTipo | null): void {
		this.dataFacade.onFilterTipoChange(value);
	}

	onDominioChange(value: string): void {
		this.dataFacade.onFilterDominioChange(value);
	}

	onDominioApply(): void {
		this.dataFacade.onFilterDominioApply();
	}

	onDesdeChange(value: Date | null): void {
		this.dataFacade.onFilterDesdeChange(value);
	}

	onHastaChange(value: Date | null): void {
		this.dataFacade.onFilterHastaChange(value);
	}

	onClearFilters(): void {
		this.dataFacade.clearFiltros();
		this.hubFiltered.set(false);
	}

	clearHubFilter(): void {
		this.onClearFilters();
	}

	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onPageChange(event: PaginatorState): void {
		const first = event.first ?? 0;
		const newPage = Math.floor(first / PAGE_SIZE) + 1;
		if (newPage === this.vm().page) return;
		this.dataFacade.loadPage(newPage);
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
			...this.vm().events.map((e) =>
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
