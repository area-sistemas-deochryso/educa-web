/* eslint-disable max-lines -- Razón: ya excedía el límite (367 líneas) antes de Plan 81 F4; la
   deuda de tamaño es preexistente (kanban + tabla + eventos + heatmap + trend en un componente),
   no introducida por el borrado/selección múltiple agregado acá. Split queda fuera de alcance. */
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorGroupsViewMode } from '@core/services/storage';
import { PageHeaderComponent } from '@intranet-shared/components';
import { TableSkeletonComponent } from '@intranet-shared/components/table-skeleton';

import { HubContextBannerComponent, readHubContext } from '../monitoreo/shared';

import { ChangeGroupStatusDialogComponent } from './components/change-group-status-dialog';
import { ErrorGroupDetailDrawerComponent } from './components/error-group-detail-drawer';
import { ErrorGroupsKanbanBoardComponent } from './components/error-groups-kanban-board';
import { ErrorGroupsViewToggleComponent } from './components/error-groups-view-toggle';
import { ErrorHeatmapComponent } from './components/error-heatmap';
import { ErrorOccurrenceTimelineComponent } from './components/error-occurrence-timeline';
import { ErrorParetoChartComponent } from './components/error-pareto-chart';
import { ErrorOccurrenceDrawerComponent } from './components/error-occurrence-drawer';
import {
	ESTADO_OPTIONS,
	ORIGEN_OPTIONS,
	SEARCH_MAX,
	SEVERIDAD_OPTIONS,
	TABLE_SKELETON_COLUMNS,
	getEstadoLabel,
	getEstadoSeverity,
	getOrigenIcon,
	getSeveridadSeverity,
} from './config';
import {
	CambiarEstadoErrorGroup,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorGroupSortField,
	ErrorLogCompleto,
	ErrorOrigen,
	ErrorSeveridad,
	OcurrenciaLista,
} from './models';
import {
	ErrorGroupsCrudFacade,
	ErrorGroupsDataFacade,
	ErrorGroupsStore,
	ErrorGroupsUiFacade,
} from './services';

@Component({
	selector: 'app-error-groups',
	standalone: true,
	imports: [
		CommonModule,
		DatePipe,
		FormsModule,
		ButtonModule,
		CheckboxModule,
		ConfirmDialogModule,
		DialogModule,
		IconFieldModule,
		InputIconModule,
		InputNumberModule,
		InputTextModule,
		PaginatorModule,
		SelectModule,
		TableModule,
		TagModule,
		TooltipModule,
		ErrorOccurrenceTimelineComponent,
		PageHeaderComponent,
		TableSkeletonComponent,
		ErrorGroupDetailDrawerComponent,
		ErrorOccurrenceDrawerComponent,
		ChangeGroupStatusDialogComponent,
		ErrorGroupsKanbanBoardComponent,
		ErrorGroupsViewToggleComponent,
		ErrorHeatmapComponent,
		ErrorParetoChartComponent,
		HubContextBannerComponent,
	],
	templateUrl: './error-groups.component.html',
	styleUrl: './error-groups.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ConfirmationService],
})
export class ErrorGroupsComponent implements OnInit {
	protected readonly store = inject(ErrorGroupsStore);
	private readonly dataFacade = inject(ErrorGroupsDataFacade);
	private readonly crudFacade = inject(ErrorGroupsCrudFacade);
	private readonly uiFacade = inject(ErrorGroupsUiFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private readonly confirmationService = inject(ConfirmationService);

	readonly items = this.store.visibleItems;
	readonly stats = this.store.stats;
	readonly loading = this.store.loading;
	readonly error = this.store.error;
	readonly tableReady = this.store.tableReady;
	readonly filterEstado = this.store.filterEstado;
	readonly filterSeveridad = this.store.filterSeveridad;
	readonly filterOrigen = this.store.filterOrigen;
	readonly searchTerm = this.store.searchTerm;
	readonly hideResolvedIgnored = this.store.hideResolvedIgnored;
	readonly filterOcurrenciasMin = this.store.filterOcurrenciasMin;
	readonly excluirRuido = this.store.excluirRuido;
	readonly sortField = this.store.sortField;
	readonly sortDireccion = this.store.sortDireccion;
	readonly drawerVisible = this.store.drawerVisible;
	readonly selectedGroup = this.store.selectedGroup;
	readonly selectedDetalle = this.store.selectedDetalle;
	readonly detalleLoading = this.store.detalleLoading;
	readonly ocurrencias = this.store.ocurrencias;
	readonly ocurrenciasLoading = this.store.ocurrenciasLoading;
	readonly ocurrenciasPage = this.store.ocurrenciasPage;
	readonly ocurrenciasPageSize = this.store.ocurrenciasPageSize;
	readonly occurrenceDrawerVisible = this.store.occurrenceDrawerVisible;
	readonly selectedOcurrenciaId = this.store.selectedOcurrenciaId;
	readonly dialogVisible = this.store.dialogVisible;
	readonly dialogGroup = this.store.dialogGroup;
	readonly selectedIds = this.store.selectedIds;
	readonly selectedCount = this.store.selectedCount;
	readonly allSelected = computed(() => {
		const visible = this.items();
		const selected = this.selectedIds();
		return visible.length > 0 && visible.every((g) => selected.has(g.id));
	});
	readonly trendCache = this.store.trendCache;
	readonly trendDialogVisible = this.store.trendDialogVisible;
	readonly trendDialogGroup = this.store.trendDialogGroup;
	readonly trendDialogEntry = computed(() => {
		const g = this.trendDialogGroup();
		return g ? this.trendCache().get(g.id) : undefined;
	});
	readonly trendDialogData = computed<readonly number[]>(() => this.trendDialogEntry()?.data ?? []);
	readonly trendDialogTruncado = computed(() => this.trendDialogEntry()?.truncado ?? false);

	readonly page = this.store.page;
	readonly pageSize = this.store.pageSize;
	readonly totalCount = this.store.totalCount;

	readonly totalRecordsEstimate = computed(() => {
		const total = this.totalCount();
		const items = this.store.items();
		const p = this.page();
		const ps = this.pageSize();
		if (total !== null) return total;
		const offset = (p - 1) * ps;
		return items.length < ps ? offset + items.length : offset + ps + 1;
	});

	readonly paginatorFirst = computed(() => (this.page() - 1) * this.pageSize());

	readonly viewMode = signal<ErrorGroupsViewMode>('kanban');
	readonly hubFiltered = signal(false);
	readonly hubFilterMessage = signal('');

	readonly eventItems = this.store.eventItems;
	readonly eventLoading = this.store.eventLoading;
	readonly eventTotalCount = this.store.eventTotalCount;
	readonly eventPage = this.store.eventPage;
	readonly eventPageSize = this.store.eventPageSize;
	readonly eventPaginatorFirst = computed(() => (this.eventPage() - 1) * this.eventPageSize());
	readonly eventTotalEstimate = computed(() => {
		const total = this.eventTotalCount();
		if (total !== null) return total;
		const items = this.eventItems();
		const p = this.eventPage();
		const ps = this.eventPageSize();
		const offset = (p - 1) * ps;
		return items.length < ps ? offset + items.length : offset + ps + 1;
	});

	private readonly _trendDispatcher = effect(() => {
		const items = this.store.items();
		for (const item of items) {
			this.dataFacade.requestTrend(item.id);
		}
	});

	readonly estadoOptions = ESTADO_OPTIONS;
	readonly severidadOptions = SEVERIDAD_OPTIONS;
	readonly origenOptions = ORIGEN_OPTIONS;
	readonly tableSkeletonColumns = TABLE_SKELETON_COLUMNS;
	readonly searchMax = SEARCH_MAX;
	readonly getSeveridadSeverity = getSeveridadSeverity;
	readonly getEstadoLabel = getEstadoLabel;
	readonly getEstadoSeverity = getEstadoSeverity;
	readonly getOrigenIcon = getOrigenIcon;

	ngOnInit(): void {
		const hubCtx = readHubContext(this.route);
		if (hubCtx.fromHub && hubCtx.level) {
			const severidad: ErrorSeveridad = hubCtx.level === 'critical' ? 'CRITICAL' : 'WARNING';
			this.store.setFilterSeveridad(severidad);
			this.hubFiltered.set(true);
			this.hubFilterMessage.set(`Filtrado desde el hub — mostrando errores ${severidad}`);
		}

		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				if (!this.hubFiltered()) {
					this.hydrateFromUrl(params);
				}
				if (!this.tableReady()) {
					this.dataFacade.loadData();
				}
			});
		this.dataFacade.loadHeatmap();
	}

	private hydrateFromUrl(params: { get(name: string): string | null }): void {
		const estado = params.get('estado') as ErrorGroupEstado | null;
		const severidad = params.get('severidad') as ErrorSeveridad | null;
		const origen = params.get('origen') as ErrorOrigen | null;
		this.store.setFilterEstado(this.estadoOptions.find((o) => o.value === estado)?.value ?? null);
		this.store.setFilterSeveridad(this.severidadOptions.find((o) => o.value === severidad)?.value ?? null);
		this.store.setFilterOrigen(this.origenOptions.find((o) => o.value === origen)?.value ?? null);
		this.store.setSearchTerm(params.get('q') ?? '');
		const paginaRaw = params.get('pagina');
		const pagina = paginaRaw ? parseInt(paginaRaw, 10) : 1;
		if (!Number.isNaN(pagina) && pagina > 0) {
			this.store.setPage(pagina);
		}
	}

	private syncUrl(): void {
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: {
				estado: this.filterEstado(),
				severidad: this.filterSeveridad(),
				origen: this.filterOrigen(),
				q: this.searchTerm() || null,
				pagina: this.page() > 1 ? String(this.page()) : null,
			},
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	onRefresh(): void {
		this.dataFacade.refresh();
	}
	onExportGrupos(): void {
		this.dataFacade.exportarGrupos();
	}
	onExportOcurrencias(grupoId: number): void {
		this.dataFacade.exportarOcurrencias(grupoId);
	}
	onSearchChange(term: string): void {
		const truncated = term.length > SEARCH_MAX ? term.slice(0, SEARCH_MAX) : term;
		this.dataFacade.onSearchChange(truncated);
		this.syncUrl();
	}
	onFilterEstadoChange(estado: ErrorGroupEstado | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.dataFacade.loadData();
		this.syncUrl();
	}
	onFilterSeveridadChange(severidad: ErrorSeveridad | null): void {
		this.store.setFilterSeveridad(severidad);
		this.store.setPage(1);
		this.dataFacade.loadData();
		if (this.viewMode() === 'events') {
			this.store.setEventPage(1);
			this.dataFacade.loadEventData();
		}
		this.syncUrl();
	}
	onFilterOrigenChange(origen: ErrorOrigen | null): void {
		this.store.setFilterOrigen(origen);
		this.store.setPage(1);
		this.dataFacade.loadData();
		if (this.viewMode() === 'events') {
			this.store.setEventPage(1);
			this.dataFacade.loadEventData();
		}
		this.syncUrl();
	}

	onHideResolvedIgnoredChange(hide: boolean): void {
		this.store.setHideResolvedIgnored(hide);
	}

	onFilterOcurrenciasMinChange(min: number | null): void {
		this.store.setFilterOcurrenciasMin(min);
		this.store.setPage(1);
		this.dataFacade.loadData();
	}

	/** A diferencia de hideResolvedIgnored, excluirRuido SÍ dispara refetch (brief 429). */
	onExcluirRuidoChange(excluir: boolean): void {
		this.store.setExcluirRuido(excluir);
		this.store.setPage(1);
		this.dataFacade.loadData();
		if (this.viewMode() === 'pareto') {
			this.dataFacade.loadPareto();
		}
	}

	onSortChange(field: ErrorGroupSortField): void {
		this.store.setSort(field);
		this.store.setPage(1);
		this.dataFacade.loadData();
	}

	onClearFilters(): void {
		this.store.clearFilters();
		this.store.setPage(1);
		this.hubFiltered.set(false);
		this.dataFacade.loadData();
		this.syncUrl();
	}

	clearHubFilter(): void {
		this.onClearFilters();
	}

	onPageChange(event: PaginatorState): void {
		const currentPageSize = this.pageSize();
		const newPageSize = event.rows ?? currentPageSize;
		const newPage = (event.page ?? 0) + 1;

		if (newPageSize !== currentPageSize) {
			this.store.setPageSize(newPageSize);
			this.store.setPage(1);
			this.dataFacade.loadData();
			this.syncUrl();
			return;
		}
		if (newPage !== this.page()) {
			this.dataFacade.loadPage(newPage);
			this.syncUrl();
		}
	}

	onRowClick(group: ErrorGroupLista): void {
		this.uiFacade.openDrawer(group);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDrawer();
	}

	onOccurrenceSelected(item: OcurrenciaLista): void {
		this.uiFacade.openOccurrenceDrawer(item.id);
	}

	onOccurrenceDrawerVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeOccurrenceDrawer();
	}

	onOccurrenceStaleData(_id: number): void {
		const grp = this.selectedGroup();
		if (grp) this.dataFacade.loadOcurrencias(grp.id);
	}

	onOcurrenciasPageChange(event: { page: number; pageSize: number }): void {
		const grp = this.selectedGroup();
		if (!grp) return;
		if (event.pageSize !== this.ocurrenciasPageSize()) {
			this.dataFacade.setOcurrenciasPageSize(grp.id, event.pageSize);
		} else {
			this.dataFacade.loadOcurrenciasPage(grp.id, event.page);
		}
	}

	onStatusChangeRequested(group: ErrorGroupLista): void {
		this.uiFacade.openDialog(group);
	}
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDialog();
	}
	onDialogConfirm(payload: { group: ErrorGroupLista; dto: CambiarEstadoErrorGroup }): void {
		this.crudFacade.cambiarEstado(payload.group.id, payload.dto, payload.group);
	}
	onDialogCancel(): void {
		this.uiFacade.closeDialog();
	}
	onViewModeChange(mode: ErrorGroupsViewMode): void {
		this.viewMode.set(mode);
		if (mode === 'events' && this.eventItems().length === 0) {
			this.dataFacade.loadEventData();
		}
		if (mode === 'pareto' && this.store.paretoItems().length === 0) {
			this.dataFacade.loadPareto();
		}
	}
	onKanbanCardDropped(payload: {
		group: ErrorGroupLista;
		fromEstado: ErrorGroupEstado;
		toEstado: ErrorGroupEstado;
	}): void {
		this.crudFacade.moveCardOptimistic(payload.group, payload.toEstado);
	}
	onHeatmapPeriodChange(days: 7 | 30): void {
		this.dataFacade.setHeatmapPeriod(days);
	}

	onHeatmapEndDateChange(date: Date | null): void {
		this.dataFacade.setHeatmapEndDate(date);
	}

	onSparklineClick(group: ErrorGroupLista): void {
		this.uiFacade.openTrendDialog(group);
	}
	onTrendDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeTrendDialog();
	}

	onEventRowClick(event: ErrorLogCompleto): void {
		this.uiFacade.openOccurrenceDrawer(event.id);
	}

	// #region Selección múltiple + borrado (Plan 81 F4)
	toggleSelectAll(): void {
		if (this.allSelected()) {
			this.store.clearSelection();
		} else {
			this.store.setSelectedIds(new Set(this.items().map((g) => g.id)));
		}
	}

	onDeleteRequested(group: ErrorGroupLista): void {
		this.confirmationService.confirm({
			message: `¿Eliminar el grupo "${group.mensajeRepresentativo}"? Esta acción no se puede deshacer.`,
			header: 'Eliminar grupo de errores',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Sí, eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => this.crudFacade.eliminar(group.id),
		});
	}

	onDeleteSelectedRequested(): void {
		const ids = [...this.selectedIds()];
		if (ids.length === 0) return;

		this.confirmationService.confirm({
			message: `¿Eliminar ${ids.length} grupo(s) de errores seleccionado(s)? Esta acción no se puede deshacer.`,
			header: 'Eliminar grupos en lote',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Sí, eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => this.crudFacade.eliminarMasivo(ids),
		});
	}
	// #endregion

	onEventPageChange(event: PaginatorState): void {
		const currentPageSize = this.eventPageSize();
		const newPageSize = event.rows ?? currentPageSize;
		const newPage = (event.page ?? 0) + 1;

		if (newPageSize !== currentPageSize) {
			this.store.setEventPageSize(newPageSize);
			this.store.setEventPage(1);
			this.dataFacade.loadEventData();
			return;
		}
		if (newPage !== this.eventPage()) {
			this.dataFacade.loadEventPage(newPage);
		}
	}
}
