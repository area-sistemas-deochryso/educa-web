// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleLabelPipe } from '@intranet-shared/pipes';
import { UiMappingService } from '@intranet-shared/services';
import { EventsCalendarFacade, EventsCalendarStore } from './services';
import type { EventoFormData } from './services';
import { EventoCalendarioLista } from '@data/models';
import { buildYearOptions, dateToYmd, ymdToDate, groupByMonth } from '@shared/utils';
import { DateBadgeComponent, EventTypeMarkerComponent, FormPreviewDockComponent, FormSectionComponent, IconPickerComponent, injectIsMobile, StickyFilterBarComponent, TimeStatusChipComponent } from '@shared/components';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDatePicker, EduDrawer, EduIconField, EduInputIcon, EduInputText, EduSelect, EduSelectButton, EduTag, EduTextarea, EduToggle, EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-events-calendar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [DatePipe, NgTemplateOutlet, 
		FormsModule,
		EduButton,
		EduDrawer,
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
		EstadoToggleLabelPipe,
		StickyFilterBarComponent,
		DateBadgeComponent,
		EventTypeMarkerComponent,
		TimeStatusChipComponent,
		FormSectionComponent,
		FormPreviewDockComponent,
		IconPickerComponent,
		EduSelectButton],
	providers: [EduConfirmationService],
	templateUrl: './eventos-calendario.component.html',
	styleUrl: './eventos-calendario.component.scss',
})
export class EventsCalendarComponent implements OnInit {
	/** Filtros activos sin contar el buscador (los muestra el botón «Filtros» de la barra compacta). */
	readonly activeFilterCount = computed(() => {
		const { filterTipo, filterEstado } = this.vm();
		return [filterTipo, filterEstado].filter((v) => v !== null && v !== undefined && v !== '').length;
	});

	/** Con ancho suficiente la vista previa flota a la izquierda del panel; si no, queda dentro del formulario. */
	readonly isWideScreen = injectIsMobile('(min-width: 1100px)');

	// #region Dependencias
	private facade = inject(EventsCalendarFacade);
	private store = inject(EventsCalendarStore);
	private confirmationService = inject(EduConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	showValidation = signal(false);
	// edu-datepicker trabaja con Date; el formulario guarda 'YYYY-MM-DD'. Las señales calculadas mantienen
	// la misma instancia de Date mientras el texto no cambie, así el calendario no se reinicia en cada ciclo.
	readonly fechaInicioDate = computed(() => ymdToDate(this.vm().formData.fechaInicio));
	readonly fechaFinDate = computed(() => ymdToDate(this.vm().formData.fechaFin));
	/** Fecha larga para la vista previa del detalle («sábado, 23 de noviembre de 2026»). */
	readonly fechaInicioLarga = computed(() => this.fechaLarga(this.fechaInicioDate()));
	readonly fechaFinLarga = computed(() => this.fechaLarga(this.fechaFinDate()));
	readonly anioOptions = computed(() => buildYearOptions(this.vm().filterAnio));
	/** Eventos del año agrupados por mes de inicio, cronológicos. Sin paginación: son decenas por año. */
	readonly groups = computed(() => {
		const sorted = [...this.vm().items].sort(
			(a, b) => a.fechaInicio.localeCompare(b.fechaInicio) || a.titulo.localeCompare(b.titulo),
		);
		return groupByMonth(sorted, (item) => item.fechaInicio);
	});
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

	private fechaLarga(date: Date | null): string {
		return date ? date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
	}

	// #region Form field updates
	updateField<K extends keyof EventoFormData>(field: K, value: EventoFormData[K]): void {
		this.store.updateFormField(field, value);
	}
	onDateChange(field: 'fechaInicio' | 'fechaFin', value: Date | Date[] | null): void {
		this.updateField(field, dateToYmd(Array.isArray(value) ? value[0] : value));
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
