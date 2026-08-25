import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import type { CapabilityCatalogItem } from '@core/services';

import { VistasFacade } from './services';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDialog, EduInputText, EduSelect, EduTable, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-vistas',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		EduTable,
		EduButton,
		EduDialog,
		EduTooltip,
		EduInputText,
		EduSelect,
		EduTag,
		EduConfirmDialog],
	providers: [EduConfirmationService],
	templateUrl: './vistas.component.html',
	styleUrl: './vistas.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistasComponent implements OnInit {
	// #region Dependencias
	private facade = inject(VistasFacade);
	private confirmationService = inject(EduConfirmationService);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	showValidation = signal(false);
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
		this.showValidation.set(true);
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
