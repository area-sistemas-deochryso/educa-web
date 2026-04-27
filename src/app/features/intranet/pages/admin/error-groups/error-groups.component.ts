import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorGroupsViewMode } from '@core/services/storage';
import { PageHeaderComponent } from '@intranet-shared/components';
import { TableSkeletonComponent } from '@intranet-shared/components/table-skeleton';

import { ChangeGroupStatusDialogComponent } from './components/change-group-status-dialog';
import { ErrorGroupDetailDrawerComponent } from './components/error-group-detail-drawer';
import { ErrorGroupsKanbanBoardComponent } from './components/error-groups-kanban-board';
import { ErrorGroupsViewToggleComponent } from './components/error-groups-view-toggle';
import { ErrorOccurrenceDrawerComponent } from './components/error-occurrence-drawer';
import {
	ESTADO_OPTIONS,
	ORIGEN_OPTIONS,
	SEARCH_MAX,
	SEVERIDAD_OPTIONS,
	TABLE_SKELETON_COLUMNS,
} from './config';
import {
	CambiarEstadoErrorGroup,
	ESTADO_LABEL_MAP,
	ESTADO_SEVERITY_MAP,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorOrigen,
	ErrorSeveridad,
	ORIGEN_ICON_MAP,
	OcurrenciaLista,
	SEVERIDAD_SEVERITY_MAP,
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
		IconFieldModule,
		InputIconModule,
		InputTextModule,
		PaginatorModule,
		SelectModule,
		TableModule,
		TagModule,
		TooltipModule,
		PageHeaderComponent,
		TableSkeletonComponent,
		ErrorGroupDetailDrawerComponent,
		ErrorOccurrenceDrawerComponent,
		ChangeGroupStatusDialogComponent,
		ErrorGroupsKanbanBoardComponent,
		ErrorGroupsViewToggleComponent,
	],
	templateUrl: './error-groups.component.html',
	styleUrl: './error-groups.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorGroupsComponent implements OnInit {
	// #region Dependencias
	private readonly store = inject(ErrorGroupsStore);
	private readonly dataFacade = inject(ErrorGroupsDataFacade);
	private readonly crudFacade = inject(ErrorGroupsCrudFacade);
	private readonly uiFacade = inject(ErrorGroupsUiFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto al template
	readonly items = this.store.visibleItems;
	readonly stats = this.store.stats;
	readonly loading = this.store.loading;
	readonly tableReady = this.store.tableReady;

	readonly filterEstado = this.store.filterEstado;
	readonly filterSeveridad = this.store.filterSeveridad;
	readonly filterOrigen = this.store.filterOrigen;
	readonly searchTerm = this.store.searchTerm;
	readonly hideResolvedIgnored = this.store.hideResolvedIgnored;

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

	/** Vista activa: 'kanban' o 'table'. Persistida en PreferencesStorage. */
	readonly viewMode = signal<ErrorGroupsViewMode>('kanban');
	// #endregion

	// #region Configuraciones estáticas
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly severidadOptions = SEVERIDAD_OPTIONS;
	readonly origenOptions = ORIGEN_OPTIONS;
	readonly tableSkeletonColumns = TABLE_SKELETON_COLUMNS;
	readonly searchMax = SEARCH_MAX;
	readonly severidadSeverity = SEVERIDAD_SEVERITY_MAP;
	readonly estadoLabel = ESTADO_LABEL_MAP;
	readonly estadoSeverity = ESTADO_SEVERITY_MAP;
	readonly origenIcon = ORIGEN_ICON_MAP;
	// #endregion

	// #region Lifecycle + URL sync
	ngOnInit(): void {
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				this.hydrateFromUrl(params);
				if (!this.tableReady()) {
					this.dataFacade.loadData();
				}
			});
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
	// #endregion

	// #region Event handlers — Header + filtros
	onRefresh(): void {
		this.dataFacade.refresh();
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
		this.syncUrl();
	}

	onFilterOrigenChange(origen: ErrorOrigen | null): void {
		this.store.setFilterOrigen(origen);
		this.store.setPage(1);
		this.dataFacade.loadData();
		this.syncUrl();
	}

	onHideResolvedIgnoredChange(hide: boolean): void {
		this.store.setHideResolvedIgnored(hide);
	}

	onClearFilters(): void {
		this.store.clearFilters();
		this.store.setPage(1);
		this.dataFacade.loadData();
		this.syncUrl();
	}
	// #endregion

	// #region Event handlers — Tabla + drawer del grupo
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
	// #endregion

	// #region Event handlers — Sub-drawer ocurrencia + dialog cambio estado
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
	// #endregion

	// #region Event handlers — Kanban + view toggle
	onViewModeChange(mode: ErrorGroupsViewMode): void {
		this.viewMode.set(mode);
	}

	onKanbanCardDropped(payload: {
		group: ErrorGroupLista;
		fromEstado: ErrorGroupEstado;
		toEstado: ErrorGroupEstado;
	}): void {
		this.crudFacade.moveCardOptimistic(payload.group, payload.toEstado);
	}
	// #endregion

	// #region Helpers visuales
	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadSeverity[severidad as ErrorSeveridad] ?? 'info';
	}

	getEstadoLabel(estado: string): string {
		return this.estadoLabel[estado as ErrorGroupEstado] ?? estado;
	}

	getEstadoSeverity(estado: string): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
		return this.estadoSeverity[estado as ErrorGroupEstado] ?? 'secondary';
	}

	getOrigenIcon(origen: string): string {
		return this.origenIcon[origen as ErrorOrigen] ?? 'pi pi-question';
	}
	// #endregion
}
