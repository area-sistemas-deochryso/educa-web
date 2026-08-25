// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleLabelPipe } from '@intranet-shared/pipes';
import { UiMappingService } from '@intranet-shared/services';
import { EventsCalendarFacade, EventsCalendarStore } from './services';
import type { EventoFormData } from './services';
import { EventoCalendarioLista } from '@data/models';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDatePicker, EduDialog, EduIconField, EduInputIcon, EduInputText, EduSelect, EduTable, EduTag, EduTextarea, EduToggle, EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-events-calendar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		EduTable,
		EduButton,
		EduDialog,
		EduInputText,
		EduTextarea,
		EduSelect,
		EduTag,
		EduConfirmDialog,
		EduTooltip,
		EduToggle,
		EduDatePicker,
		EduIconField,
		EduInputIcon,
		PageHeaderComponent,
		KpiStatsComponent,
		EstadoLabelPipe,
		EstadoSeverityPipe,
		EstadoToggleLabelPipe],
	providers: [EduConfirmationService],
	templateUrl: './eventos-calendario.component.html',
	styleUrl: './eventos-calendario.component.scss',
})
export class EventsCalendarComponent implements OnInit {
	// #region Dependencias
	private facade = inject(EventsCalendarFacade);
	private store = inject(EventsCalendarStore);
	private confirmationService = inject(EduConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	showValidation = signal(false);
	// #endregion

	// #region Stats KPI
	readonly statsItems = computed<KpiStatItem[]>(() => [
		{
			icon: 'pi pi-list',
			label: 'Total',
			value: this.vm().estadisticas.total,
		},
		{
			icon: 'pi pi-check-circle',
			label: 'Activos',
			value: this.vm().estadisticas.activos,
		},
		{
			icon: 'pi pi-times-circle',
			label: 'Inactivos',
			value: this.vm().estadisticas.inactivos,
		},
		{
			icon: 'pi pi-clock',
			label: 'Próximos 30 días',
			value: this.vm().estadisticas.proximosMes,
		}]);
	// #endregion

	// #region Opciones de filtros
	readonly tipoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Académico', value: 'academic' },
		{ label: 'Cultural', value: 'cultural' },
		{ label: 'Deportivo', value: 'sports' },
		{ label: 'Reunión', value: 'meeting' },
		{ label: 'Otro', value: 'other' }];

	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false }];

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
		{ label: 'Advertencia', value: 'pi-exclamation-triangle' }];
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
		this.showValidation.set(true);
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
