import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { calcPageFromLazyEvent } from '@core/helpers';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
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
	private initialLoadDone = signal(false);
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
	// #endregion

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
