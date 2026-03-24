import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { calcPageFromLazyEvent } from '@core/helpers';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { UiMappingService } from '@shared/services';
import { PageHeaderComponent } from '@shared/components';
import { EstadoSeverityPipe, EstadoToggleIconPipe, EstadoToggleLabelPipe } from '@shared/pipes';
import { buildDeleteVistaMessage } from '@app/shared/constants';

import { VistasFacade } from './services';
import type { Vista } from '@core/services';

@Component({
	selector: 'app-vistas',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		InputTextModule,
		SelectModule,
		ToggleSwitch,
		ConfirmDialogModule,
		PageHeaderComponent,
		EstadoSeverityPipe,
		EstadoToggleIconPipe,
		EstadoToggleLabelPipe,
	],
	providers: [ConfirmationService],
	templateUrl: './vistas.component.html',
	styleUrl: './vistas.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistasComponent implements OnInit {
	// #region Dependencias
	private facade = inject(VistasFacade);
	private confirmationService = inject(ConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	/** Guard para ignorar el onLazyLoad inicial (ngOnInit ya carga los datos) */
	private initialLoadDone = signal(false);
	// #endregion

	// #region Opciones estáticas
	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activas', value: 1 },
		{ label: 'Inactivas', value: 0 },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers
	onLazyLoad(event: { first?: number; rows?: number }): void {
		if (!this.initialLoadDone()) {
			this.initialLoadDone.set(true);
			return;
		}
		const { page, rows } = calcPageFromLazyEvent(event);
		this.facade.loadPage(page, rows);
	}

	refresh(): void {
		this.facade.loadAll();
	}

	openNew(): void {
		this.facade.openNewDialog();
	}

	editVista(vista: Vista): void {
		this.facade.openEditDialog(vista);
	}

	saveVista(): void {
		this.facade.saveVista();
	}

	toggleEstado(vista: Vista): void {
		this.facade.toggleEstado(vista);
	}

	deleteVista(vista: Vista): void {
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: buildDeleteVistaMessage(vista.nombre),
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.facade.delete(vista),
		});
	}

	updateFormField(field: 'ruta' | 'nombre' | 'estado', value: string | number): void {
		this.facade.updateFormField(field, value);
	}

	clearFilters(): void {
		this.facade.clearFilters();
	}

	onSearchTermChange(term: string): void {
		this.facade.setSearchTerm(term);
	}

	onFilterModuloChange(modulo: string | null): void {
		this.facade.setFilterModulo(modulo);
	}

	onFilterEstadoChange(estado: number | null): void {
		this.facade.setFilterEstado(estado);
	}
	// #endregion

	// #region Dialog sync handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion
}
