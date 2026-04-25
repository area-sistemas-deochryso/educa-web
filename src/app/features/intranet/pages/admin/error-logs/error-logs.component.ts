import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';
import { SwService } from '@core/services/sw';

import { PageHeaderComponent } from '@intranet-shared/components';
import { TableSkeletonComponent, SkeletonColumnDef } from '@intranet-shared/components/table-skeleton';

import { ErrorLogDetailDrawerComponent } from './components/error-log-detail-drawer';
import { ErrorLogsFacade } from './services';
import {
	ErrorOrigen,
	ErrorSeveridad,
	SEVERIDAD_SEVERITY_MAP,
	ORIGEN_ICON_MAP,
	type ErrorLogCompleto,
	type ErrorLogLista,
} from './models';

@Component({
	selector: 'app-error-logs',
	standalone: true,
	imports: [
		CommonModule,
		DatePipe,
		FormsModule,
		ButtonModule,
		ConfirmDialogModule,
		PaginatorModule,
		SelectModule,
		TableModule,
		TagModule,
		TooltipModule,
		PageHeaderComponent,
		TableSkeletonComponent,
		ErrorLogDetailDrawerComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './error-logs.component.html',
	styleUrl: './error-logs.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorLogsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ErrorLogsFacade);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly swService = inject(SwService);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;

	/**
	 * Total de records para el paginador. Cuando el endpoint `/count` devuelve
	 * un valor, lo usamos directamente para mostrar el número real de páginas
	 * desde la primera carga. Si por alguna razón el count no llegó (fallo
	 * fire-and-forget), caemos a la estimación progresiva original (`offset +
	 * items.length` en última página, `offset + pageSize + 1` en página llena).
	 */
	readonly totalRecordsEstimate = computed(() => {
		const { page, pageSize, items, totalCount } = this.vm();
		if (totalCount !== null) return totalCount;
		const offset = (page - 1) * pageSize;
		return items.length < pageSize ? offset + items.length : offset + pageSize + 1;
	});

	readonly paginatorFirst = computed(() => (this.vm().page - 1) * this.vm().pageSize);
	// #endregion

	// #region Opciones de filtro
	readonly origenOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Frontend', value: 'FRONTEND' },
		{ label: 'Backend', value: 'BACKEND' },
		{ label: 'Red', value: 'NETWORK' },
	];

	readonly severidadOptions = [
		{ label: 'Todas', value: null },
		{ label: 'Critical', value: 'CRITICAL' },
		{ label: 'Error', value: 'ERROR' },
		{ label: 'Warning', value: 'WARNING' },
	];

	readonly httpOptions = [
		{ label: 'Todos', value: null },
		{ label: '4xx (cliente)', value: '4xx' },
		{ label: '5xx (servidor)', value: '5xx' },
		{ label: '400 Bad Request', value: '400' },
		{ label: '404 Not Found', value: '404' },
		{ label: '409 Conflict', value: '409' },
		{ label: '422 Unprocessable', value: '422' },
		{ label: '500 Server Error', value: '500' },
	];

	readonly rolOptions = [
		{ label: 'Todos los roles', value: null },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Apoderado', value: 'Apoderado' },
		{ label: 'Estudiante', value: 'Estudiante' },
	];
	// #endregion

	// #region Skeleton
	readonly tableSkeletonColumns: SkeletonColumnDef[] = [
		{ width: '120px', cellType: 'text' },
		{ width: '80px', cellType: 'badge' },
		{ width: '80px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '80px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '60px', cellType: 'actions' },
	];
	// #endregion

	// #region Maps para template
	readonly severidadSeverity = SEVERIDAD_SEVERITY_MAP;
	readonly origenIcon = ORIGEN_ICON_MAP;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		// Plan 32 Chat 4 — leer correlationId del query param para deep-link desde
		// el hub. Si viene, se aplica como filtro y dispara load. Si no, carga normal.
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const correlationId = params.get('correlationId');
				if (correlationId !== this.vm().filterCorrelationId) {
					this.facade.setFilterCorrelationId(correlationId);
				} else if (!this.vm().tableReady) {
					this.facade.loadData();
				}
			});
	}
	// #endregion

	// #region Event handlers
	refresh(): void {
		this.facade.refresh();
	}

	onFilterOrigenChange(origen: ErrorOrigen | null): void {
		this.facade.setFilterOrigen(origen);
	}

	onFilterSeveridadChange(severidad: ErrorSeveridad | null): void {
		this.facade.setFilterSeveridad(severidad);
	}

	onFilterHttpChange(http: string | null): void {
		this.facade.setFilterHttp(http);
	}

	onFilterRolChange(rol: string | null): void {
		this.facade.setFilterUsuarioRol(rol);
	}

	onViewDetail(item: ErrorLogLista): void {
		this.facade.openDetail(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDrawer();
		}
	}

	onPageChange(event: PaginatorState): void {
		const currentPageSize = this.vm().pageSize;
		const newPageSize = event.rows ?? currentPageSize;
		const newPage = (event.page ?? 0) + 1;

		// Prioridad: cambio de pageSize resetea a página 1
		if (newPageSize !== currentPageSize) {
			this.facade.setPageSize(newPageSize);
			return;
		}
		if (newPage !== this.vm().page) {
			this.facade.loadPage(newPage);
		}
	}


	/**
	 * El drawer recibió 404 al cargar un item que estaba en la lista.
	 * Señal de que el cache SW está desactualizado (típicamente post-purga diaria).
	 * Invalidamos el cache del endpoint y refrescamos la lista — el usuario verá
	 * el mensaje "no encontrado" en el drawer, pero al cerrarlo los items fantasma
	 * ya no estarán.
	 */
	async onStaleDataDetected(id: number): Promise<void> {
		logger.warn(`[ErrorLogs] Cache stale detectado — item #${id} no existe. Invalidando y refrescando.`);
		const count = await this.swService.invalidateCacheByPattern('/api/sistema/errors');
		logger.log(`[ErrorLogs] ${count} entradas de cache invalidadas`);
		this.facade.refresh();
	}

	onDeleteRequested(err: ErrorLogCompleto): void {
		const fecha = new Date(err.fecha).toLocaleString('es-PE');
		const mensaje = err.mensaje.length > 100 ? err.mensaje.slice(0, 100) + '…' : err.mensaje;

		this.confirmationService.confirm({
			header: 'Confirmar eliminación',
			message: `¿Eliminar el error #${err.id}?

Fecha: ${fecha}
Origen: ${err.origen} · ${err.severidad}
Mensaje: "${mensaje}"

Esta acción es irreversible y también borra los breadcrumbs asociados.`,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Sí, eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				this.facade.deleteError(err.id);
			},
		});
	}

	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadSeverity[severidad as ErrorSeveridad] ?? 'info';
	}

	getOrigenIcon(origen: string): string {
		return this.origenIcon[origen as ErrorOrigen] ?? 'pi pi-question';
	}

	getOrigenSeverity(origen: string): 'info' | 'warn' | 'danger' | 'secondary' {
		if (origen === 'BACKEND') return 'warn';
		if (origen === 'NETWORK') return 'danger';
		return 'info';
	}
	// #endregion
}
