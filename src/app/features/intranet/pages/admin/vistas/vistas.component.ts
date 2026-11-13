import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { CapabilityCatalogItem } from '@core/services';
import { createClientPaging } from '@shared/utils';
import { CardActionsComponent, CardRowComponent, MobileCardListComponent, StickyFilterBarComponent, injectIsMobile } from '@shared/components';

import { VistasFacade } from './services';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDialog, EduInputText, EduSelect, EduTable, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-vistas',
	standalone: true,
	imports: [
		FormsModule,
		EduTable,
		EduButton,
		EduDialog,
		EduTooltip,
		EduInputText,
		EduSelect,
		EduTag,
		EduConfirmDialog,
		StickyFilterBarComponent,
		MobileCardListComponent,
		CardRowComponent,
		CardActionsComponent],
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
	readonly itemsPaging = createClientPaging(computed(() => this.vm().items));
	readonly isMobile = injectIsMobile();
	/** Filtros activos sin contar el buscador (los muestra el botón «Filtros» de la barra compacta). */
	readonly activeFilterCount = computed(() => {
		const { filterModulo, filterRuta } = this.vm();
		return (filterModulo ? 1 : 0) + (filterRuta !== 'all' ? 1 : 0);
	});
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

	updateFormField(field: 'codigo' | 'nombre' | 'modulo' | 'descripcion' | 'ruta', value: string): void {
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
