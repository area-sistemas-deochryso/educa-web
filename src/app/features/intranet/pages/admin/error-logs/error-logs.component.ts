import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@intranet-shared/components';
import { TableSkeletonComponent, SkeletonColumnDef } from '@intranet-shared/components/table-skeleton';

import { ErrorLogsFacade } from './services';
import {
	ErrorOrigen,
	ErrorSeveridad,
	SEVERIDAD_SEVERITY_MAP,
	ORIGEN_ICON_MAP,
	ORIGEN_LABEL_MAP,
	TIPO_ACCION_ICON_MAP,
	parseSourceLocation,
	type ErrorLogLista,
	type BreadcrumbTipoAccion,
	type SourceLocation,
} from './models';

@Component({
	selector: 'app-error-logs',
	standalone: true,
	imports: [
		CommonModule,
		DatePipe,
		FormsModule,
		ButtonModule,
		DrawerModule,
		SelectModule,
		TableModule,
		TagModule,
		TimelineModule,
		TooltipModule,
		PageHeaderComponent,
		TableSkeletonComponent,
	],
	templateUrl: './error-logs.component.html',
	styleUrl: './error-logs.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorLogsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ErrorLogsFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
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
	readonly origenLabel = ORIGEN_LABEL_MAP;
	readonly tipoAccionIcon = TIPO_ACCION_ICON_MAP;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadData();
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

	onViewDetail(item: ErrorLogLista): void {
		this.facade.openDetail(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDrawer();
		}
	}

	getSeveridadSeverity(severidad: string): 'danger' | 'warn' | 'info' {
		return this.severidadSeverity[severidad as ErrorSeveridad] ?? 'info';
	}

	getOrigenIcon(origen: string): string {
		return this.origenIcon[origen as ErrorOrigen] ?? 'pi pi-question';
	}

	getTipoAccionIcon(tipo: string): string {
		return this.tipoAccionIcon[tipo as BreadcrumbTipoAccion] ?? 'pi pi-circle';
	}

	getOrigenLabel(origen: string): string {
		return this.origenLabel[origen as ErrorOrigen] ?? origen;
	}

	getOrigenSeverity(origen: string): 'info' | 'warn' | 'danger' | 'secondary' {
		if (origen === 'BACKEND') return 'warn';
		if (origen === 'NETWORK') return 'danger';
		return 'info';
	}

	getSourceLocation(json: string | null): SourceLocation | null {
		return parseSourceLocation(json);
	}

	formatSourceLocation(json: string | null): string {
		const loc = parseSourceLocation(json);
		if (!loc?.funcion) return '';
		return loc.funcion;
	}
	// #endregion
}
