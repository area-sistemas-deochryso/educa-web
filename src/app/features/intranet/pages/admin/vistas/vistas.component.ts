import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { PageHeaderComponent } from '@intranet-shared/components';
import type { CapabilityCatalogItem } from '@core/services';

import { VistasFacade } from './services';

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
		InputTextModule,
		SelectModule,
		TagModule,
		ConfirmDialogModule,
		PageHeaderComponent,
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
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers
	refresh(): void {
		this.facade.loadAll();
	}

	openNew(): void {
		this.facade.openNewDialog();
	}

	editCapability(cap: CapabilityCatalogItem): void {
		this.facade.openEditDialog(cap);
	}

	saveCapability(): void {
		this.facade.saveCapability();
	}

	deleteCapability(cap: CapabilityCatalogItem): void {
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: `¿Eliminar la capability "${cap.nombre}" (${cap.codigo})?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				if (this.vm().loading) return;
				this.facade.delete(cap);
			},
		});
	}

	updateFormField(field: 'codigo' | 'nombre' | 'modulo' | 'descripcion', value: string): void {
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

	onFilterRutaChange(value: 'all' | 'with' | 'without'): void {
		this.facade.setFilterRuta(value);
	}
	// #endregion

	segmentSeverity(segment: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
		switch (segment) {
			case 'admin': return 'danger';
			case 'profesor': return 'info';
			case 'estudiante': return 'success';
			default: return 'secondary';
		}
	}

	// #region Dialog sync
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
