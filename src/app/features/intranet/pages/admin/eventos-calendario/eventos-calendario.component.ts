// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { PageHeaderComponent } from '@shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleLabelPipe } from '@shared/pipes';
import { UiMappingService } from '@shared/services';
import { EventosCalendarioFacade, EventosCalendarioStore } from './services';
import type { EventoFormData } from './services';
import { EventoCalendarioLista } from '@data/models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-eventos-calendario',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		InputTextModule,
		TextareaModule,
		Select,
		TagModule,
		ConfirmDialogModule,
		TooltipModule,
		ToggleSwitchModule,
		DatePickerModule,
		IconFieldModule,
		InputIconModule,
		PageHeaderComponent,
		EstadoLabelPipe,
		EstadoSeverityPipe,
		EstadoToggleLabelPipe,
	],
	providers: [ConfirmationService],
	templateUrl: './eventos-calendario.component.html',
	styleUrl: './eventos-calendario.component.scss',
})
export class EventosCalendarioComponent implements OnInit {
	// #region Dependencias
	private facade = inject(EventosCalendarioFacade);
	private store = inject(EventosCalendarioStore);
	private confirmationService = inject(ConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Opciones de filtros
	readonly tipoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Académico', value: 'academic' },
		{ label: 'Cultural', value: 'cultural' },
		{ label: 'Deportivo', value: 'sports' },
		{ label: 'Reunión', value: 'meeting' },
		{ label: 'Otro', value: 'other' },
	];

	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	readonly iconoOptions = [
		{ label: 'Calendario', value: 'pi-calendar' },
		{ label: 'Calendario+', value: 'pi-calendar-plus' },
		{ label: 'Libro', value: 'pi-book' },
		{ label: 'Usuarios', value: 'pi-users' },
		{ label: 'Corazón', value: 'pi-heart' },
		{ label: 'Bandera', value: 'pi-flag' },
		{ label: 'Trofeo', value: 'pi-trophy' },
		{ label: 'Estrella', value: 'pi-star' },
		{ label: 'Sol', value: 'pi-sun' },
		{ label: 'Archivo', value: 'pi-file-edit' },
		{ label: 'Graduación', value: 'pi-graduation-cap' },
		{ label: 'Advertencia', value: 'pi-exclamation-triangle' },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers

	onSearch(term: string): void {
		this.store.setSearchTerm(term);
	}

	onFilterTipo(tipo: string | null): void {
		this.store.setFilterTipo(tipo);
	}

	onFilterEstado(estado: boolean | null): void {
		this.store.setFilterEstado(estado);
	}

	onClearFiltros(): void {
		this.store.clearFiltros();
	}

	onNew(): void {
		this.facade.openNewDialog();
	}

	onEdit(item: EventoCalendarioLista): void {
		this.facade.openEditDialog(item);
	}

	onToggleEstado(item: EventoCalendarioLista): void {
		this.facade.toggleEstado(item);
	}

	onDelete(item: EventoCalendarioLista): void {
		this.facade.openConfirmDialog();
		this.confirmationService.confirm({
			message: `¿Eliminar el evento "${item.titulo}"?`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				if (this.vm().loading) return;
				this.facade.delete(item);
			},
		});
	}

	onSave(): void {
		if (this.vm().isEditing) {
			this.facade.update();
		} else {
			this.facade.create();
		}
	}

	onChangeAnio(anio: number): void {
		this.facade.changeAnio(anio);
	}

	// #endregion

	// #region Form field updates
	updateField<K extends keyof EventoFormData>(field: K, value: EventoFormData[K]): void {
		this.store.updateFormField(field, value);
	}
	// #endregion

	// #region Dialog handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeDialog();
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion

	// UI helpers: uiMapping.getEventoTipoSeverity(), uiMapping.getEventoTipoLabel()
}
// #endregion
