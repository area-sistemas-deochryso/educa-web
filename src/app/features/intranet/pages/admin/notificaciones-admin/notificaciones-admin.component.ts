// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleLabelPipe } from '@intranet-shared/pipes';
import { UiMappingService } from '@intranet-shared/services';
import { NotificacionesAdminFacade, NotificacionesAdminStore } from './services';
import type { NotificacionFormData } from './services';
import { NotificacionLista } from '@data/models';
import { buildYearOptions, dateToYmd, ymdToDate, type TimeStatus } from '@shared/utils';
import { FormPreviewDockComponent, FormSectionComponent, IconPickerComponent, injectIsMobile, StickyFilterBarComponent, TimeStatusChipComponent } from '@shared/components';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDatePicker, EduDrawer, EduIconField, EduInputIcon, EduInputText, EduSelect, EduSelectButton, EduTag, EduTextarea, EduToggle, EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-notificaciones-admin',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [DatePipe, NgTemplateOutlet, 
		FormsModule,
		EduButton,
		EduDrawer,
		EduSelectButton,
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
		TimeStatusChipComponent,
		FormSectionComponent,
		FormPreviewDockComponent,
		IconPickerComponent],
	providers: [EduConfirmationService],
	templateUrl: './notificaciones-admin.component.html',
	styleUrl: './notificaciones-admin.component.scss',
})
export class NotificacionesAdminComponent implements OnInit {
	/** Filtros activos sin contar el buscador (los muestra el botón «Filtros» de la barra compacta). */
	readonly activeFilterCount = computed(() => {
		const { filterTipo, filterEstado } = this.vm();
		return [filterTipo, filterEstado].filter((v) => v !== null && v !== undefined && v !== '').length;
	});

	/** Con ancho suficiente la vista previa flota a la izquierda del panel; si no, queda dentro del formulario. */
	readonly isWideScreen = injectIsMobile('(min-width: 1100px)');

	// #region Dependencias
	private facade = inject(NotificacionesAdminFacade);
	private store = inject(NotificacionesAdminStore);
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
	/** Días que dura la vigencia, contando inicio y fin (0 si falta una fecha o el rango está al revés). */
	readonly vigenciaDias = computed(() => {
		const start = this.fechaInicioDate();
		const end = this.fechaFinDate();
		if (!start || !end || end < start) return 0;
		return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
	});
	readonly anioOptions = computed(() => buildYearOptions(this.vm().filterAnio));
	/** Tarjetas, la más reciente primero. Sin paginación: son decenas por año. */
	readonly sortedItems = computed(() =>
		[...this.vm().items].sort(
			(a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || a.titulo.localeCompare(b.titulo),
		),
	);
	/** Para una vigencia "En curso" suena mejor "Vigente". */
	readonly vigenciaLabels: Partial<Record<TimeStatus, string>> = { ongoing: 'Vigente' };

	// Destinatario: "Todos" deja los 3 campos en null; "Segmentar" muestra los 3 selects (mismos campos de siempre).
	readonly destinatarioModeOptions = [
		{ label: 'Todos', value: 'all' },
		{ label: 'Segmentar', value: 'segment' }];
	private readonly forceSegment = signal(false);
	readonly destinatarioMode = computed<'all' | 'segment'>(() => {
		const { destinatarioRol, destinatarioGrado, destinatarioSeccion } = this.vm().formData;
		return this.forceSegment() || destinatarioRol || destinatarioGrado || destinatarioSeccion ? 'segment' : 'all';
	});
	readonly destinatarioSummary = computed(() => {
		const { destinatarioRol, destinatarioGrado, destinatarioSeccion } = this.vm().formData;
		return this.formatDestinatario(destinatarioRol, destinatarioGrado, destinatarioSeccion);
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
			label: 'Activas',
			value: this.vm().estadisticas.activas,
		},
		{
			icon: 'pi pi-times-circle',
			label: 'Inactivas',
			value: this.vm().estadisticas.inactivas,
		},
		{
			icon: 'pi pi-calendar-clock',
			label: 'Vigentes hoy',
			value: this.vm().estadisticas.vigentesHoy,
		}]);
	// #endregion

	// #region Opciones de filtros
	readonly tipoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Matrícula', value: 'matricula' },
		{ label: 'Pago', value: 'pago' },
		{ label: 'Académico', value: 'academico' },
		{ label: 'Festividad', value: 'festividad' },
		{ label: 'Evento', value: 'evento' }];

	readonly prioridadOptions = [
		{ label: 'Baja', value: 'low' },
		{ label: 'Media', value: 'medium' },
		{ label: 'Alta', value: 'high' },
		{ label: 'Urgente', value: 'urgent' }];


	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false }];

	readonly iconoOptions = [
		{ label: 'Campana', value: 'pi-bell' },
		{ label: 'Calendario', value: 'pi-calendar' },
		{ label: 'Calendario+', value: 'pi-calendar-plus' },
		{ label: 'Billetera', value: 'pi-wallet' },
		{ label: 'Gráfico', value: 'pi-chart-bar' },
		{ label: 'Libro', value: 'pi-book' },
		{ label: 'Estrella', value: 'pi-star-fill' },
		{ label: 'Corazón', value: 'pi-heart-fill' },
		{ label: 'Bandera', value: 'pi-flag-fill' },
		{ label: 'Usuarios', value: 'pi-users' },
		{ label: 'Trofeo', value: 'pi-trophy' },
		{ label: 'Sol', value: 'pi-sun' },
		{ label: 'Regalo', value: 'pi-gift' },
		{ label: 'Advertencia', value: 'pi-exclamation-triangle' },
		{ label: 'Info', value: 'pi-exclamation-circle' },
		{ label: 'Archivo', value: 'pi-file-edit' },
		{ label: 'Refrescar', value: 'pi-refresh' }];

	readonly destinatarioRolOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Apoderado', value: 'Apoderado' },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
		{ label: 'Promotor', value: 'Promotor' }];

	readonly destinatarioGradoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Inicial 3 años', value: 'Inicial 3' },
		{ label: 'Inicial 4 años', value: 'Inicial 4' },
		{ label: 'Inicial 5 años', value: 'Inicial 5' },
		{ label: '1° Primaria', value: '1° Primaria' },
		{ label: '2° Primaria', value: '2° Primaria' },
		{ label: '3° Primaria', value: '3° Primaria' },
		{ label: '4° Primaria', value: '4° Primaria' },
		{ label: '5° Primaria', value: '5° Primaria' },
		{ label: '6° Primaria', value: '6° Primaria' },
		{ label: '1° Secundaria', value: '1° Secundaria' },
		{ label: '2° Secundaria', value: '2° Secundaria' },
		{ label: '3° Secundaria', value: '3° Secundaria' },
		{ label: '4° Secundaria', value: '4° Secundaria' },
		{ label: '5° Secundaria', value: '5° Secundaria' }];

	readonly destinatarioSeccionOptions = [
		{ label: 'Todos', value: null },
		{ label: 'A', value: 'A' },
		{ label: 'B', value: 'B' },
		{ label: 'C', value: 'C' },
		{ label: 'D', value: 'D' },
		{ label: 'V (Vacacional)', value: 'V' }];
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
		this.forceSegment.set(false);
		this.facade.openNewDialog();
	}

	onEdit(item: NotificacionLista): void {
		this.forceSegment.set(false);
		this.facade.openEditDialog(item);
	}

	onDestinatarioMode(mode: 'all' | 'segment'): void {
		if (mode === 'all') {
			this.store.updateFormField('destinatarioRol', null);
			this.store.updateFormField('destinatarioGrado', null);
			this.store.updateFormField('destinatarioSeccion', null);
		}
		this.forceSegment.set(mode === 'segment');
	}

	onToggleEstado(item: NotificacionLista): void {
		this.facade.toggleEstado(item);
	}

	onDelete(item: NotificacionLista): void {
		this.facade.openConfirmDialog();
		this.confirmationService.confirm({
			message: `¿Eliminar la notificación "${item.titulo}"?`,
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
	updateField<K extends keyof NotificacionFormData>(field: K, value: NotificacionFormData[K]): void {
		this.store.updateFormField(field, value);
	}
	onDateChange(field: 'fechaInicio' | 'fechaFin', value: Date | Date[] | null): void {
		this.updateField(field, dateToYmd(Array.isArray(value) ? value[0] : value));
	}
	// #endregion

	// #region Dialog handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.forceSegment.set(false);
			this.facade.closeDialog();
		}
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion

	// #region UI helpers
	getDestinatarioLabel(item: NotificacionLista): string {
		return this.formatDestinatario(item.destinatarioRol, item.destinatarioGrado, item.destinatarioSeccion);
	}

	private formatDestinatario(rol: string | null, grado: string | null, seccion: string | null): string {
		const parts: string[] = [];
		if (rol) parts.push(rol);
		if (grado) parts.push(grado);
		if (seccion) parts.push(`Sección ${seccion}`);
		return parts.length > 0 ? parts.join(' - ') : 'Todos';
	}
	// #endregion
}
// #endregion
