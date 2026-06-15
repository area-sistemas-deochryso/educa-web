import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ScheduleDetailDrawerComponent } from './components/horario-detail-drawer/horario-detail-drawer.component';
import { SchedulesCoursePickerComponent } from './components/horarios-curso-picker/horarios-curso-picker.component';
import { SchedulesFormDialogComponent } from './components/horarios-form-dialog/horarios-form-dialog.component';
import { SchedulesImportDialogComponent } from './components/horarios-import-dialog/horarios-import-dialog.component';
import { PageHeaderComponent } from '@intranet-shared/components';
import { type ImportarHorarioItem } from './helpers/horario-import.config';
import {
	type DiaSemana,
	type EmptySlotClickEvent,
	HorarioResponseDto,
	type HorarioVistaType,
} from './models/horario.interface';
import { SchedulesCrudFacade, SchedulesDataFacade, SchedulesUiFacade } from './services';
import { SchedulesStatsSkeletonComponent } from './components/horarios-stats-skeleton/horarios-stats-skeleton.component';
import { ScheduleGridLayoutComponent } from './components/schedule-grid-layout/schedule-grid-layout.component';
import { ScheduleGlobalViewComponent } from './components/schedule-global-view/schedule-global-view.component';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { logger } from '@core/helpers';
import {
	UI_CONFIRM_HEADERS,
	UI_CONFIRM_LABELS,
	UI_HORARIOS_CONFIRM_MESSAGES,
	buildDeleteHorarioMessage,
	buildToggleHorarioMessage,
} from '@app/shared/constants';

@Component({
	selector: 'app-schedules',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		ConfirmDialogModule,
		SelectModule,
		TagModule,
		TooltipModule,
		ScheduleDetailDrawerComponent,
		SchedulesCoursePickerComponent,
		SchedulesFormDialogComponent,
		SchedulesImportDialogComponent,
		SchedulesStatsSkeletonComponent,
		ScheduleGridLayoutComponent,
		ScheduleGlobalViewComponent,
		PageHeaderComponent,
	],
	templateUrl: './horarios.component.html',
	styleUrl: './horarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ConfirmationService],
})
export class SchedulesComponent implements OnInit {
	private dataFacade = inject(SchedulesDataFacade);
	private crudFacade = inject(SchedulesCrudFacade);
	private uiFacade = inject(SchedulesUiFacade);
	private confirmationService = inject(ConfirmationService);

	readonly vm = this.dataFacade.vm;

	readonly estadoOptions = [
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	// #region Lifecycle
	ngOnInit(): void {
		this.loadData();
	}

	// #endregion
	// #region Métodos de carga
	loadData(): void {
		this.dataFacade.loadAll();
	}

	refresh(): void {
		logger.log('Refrescando horarios...');
		this.loadData();
	}

	// #endregion
	// #region Event handlers - CRUD
	onNew(): void {
		this.uiFacade.openNewDialog();
	}

	onEdit(id: number): void {
		this.uiFacade.openEditDialog(id);
	}

	onViewDetail(id: number): void {
		this.dataFacade.loadDetalle(id);
	}

	onToggleEstado(id: number, estadoActual: boolean): void {
		const accion = estadoActual ? 'desactivar' : 'activar';
		const header = estadoActual
			? UI_CONFIRM_HEADERS.deactivateHorario
			: UI_CONFIRM_HEADERS.activateHorario;

		this.confirmationService.confirm({
			message: buildToggleHorarioMessage(accion),
			header,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: UI_CONFIRM_LABELS.yes,
			rejectLabel: UI_CONFIRM_LABELS.no,
			accept: () => {
				if (this.vm().loading) return;
				this.crudFacade.toggleEstado(id, estadoActual);
			},
		});
	}

	onDelete(id: number): void {
		const horario = this.vm().horarios.find((h) => h.id === id);
		if (!horario) return;

		this.confirmationService.confirm({
			message: buildDeleteHorarioMessage(
				horario.cursoNombre,
				horario.diaSemanaDescripcion,
				horario.horaInicio,
				horario.horaFin,
			),
			header: UI_CONFIRM_HEADERS.delete,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: UI_CONFIRM_LABELS.yesDelete,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				if (this.vm().loading) return;
				this.crudFacade.delete(id);
			},
		});
	}

	// #endregion
	// #region Event handlers - Filtros y vista
	onFiltroEstadoChange(estadoActivo: boolean | null): void {
		this.dataFacade.setFiltroEstadoActivo(estadoActivo);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
	}

	onCambiarVista(vista: HorarioVistaType): void {
		this.dataFacade.setVistaActual(vista);
	}

	onSelectEntity(entityId: number): void {
		this.dataFacade.selectEntity(entityId);
	}

	// #endregion
	// #region Event handlers - Grid
	onEmptySlotClick(event: EmptySlotClickEvent): void {
		this.uiFacade.openNewDialogWithContext(event);
	}

	// #endregion
	// #region Event handlers - Wizard Dialog
	onSaveHorario(): void {
		const formData = this.vm().formData;
		const editingId = this.vm().editingId;
		const currentUser = this.vm().currentUser;

		if (!currentUser) {
			logger.error('Usuario no autenticado');
			return;
		}

		if (editingId === null) {
			this.crudFacade.create({
				diaSemana: formData.diaSemana!,
				horaInicio: formData.horaInicio,
				horaFin: formData.horaFin,
				salonId: formData.salonId!,
				cursoId: formData.cursoId!,
				usuarioReg: currentUser.dni || currentUser.nombreCompleto,
			});
		} else {
			this.crudFacade.update(editingId, {
				id: editingId,
				diaSemana: formData.diaSemana!,
				horaInicio: formData.horaInicio,
				horaFin: formData.horaFin,
				salonId: formData.salonId!,
				cursoId: formData.cursoId!,
				usuarioMod: currentUser.dni || currentUser.nombreCompleto,
			});
		}
	}

	onCancelDialog(): void {
		this.uiFacade.closeDialog();
	}

	// #endregion
	// #region Event handlers - Detail Drawer
	onCloseDetailDrawer(): void {
		this.uiFacade.closeDetailDrawer();
	}

	// #endregion
	// #region Event handlers - Asignaciones
	onAsignarProfesor(horarioId: number, profesorId: number): void {
		const currentUser = this.vm().currentUser;
		if (!currentUser) return;

		this.crudFacade.asignarProfesor({
			horarioId,
			profesorId,
			usuarioMod: currentUser.dni || currentUser.nombreCompleto,
		});
	}

	onAsignarTodosEstudiantes(horarioId: number): void {
		const currentUser = this.vm().currentUser;
		if (!currentUser) return;

		this.confirmationService.confirm({
			message: UI_HORARIOS_CONFIRM_MESSAGES.assignAllEstudiantes,
			header: UI_CONFIRM_HEADERS.assign,
			icon: 'pi pi-question-circle',
			acceptLabel: UI_CONFIRM_LABELS.yesAssignAll,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			accept: () => {
				if (this.vm().loading) return;
				this.crudFacade.asignarTodosEstudiantes(
					horarioId,
					currentUser.dni || currentUser.nombreCompleto,
				);
			},
		});
	}

	onDesasignarProfesor(horarioId: number): void {
		const currentUser = this.vm().currentUser;
		if (!currentUser) return;

		this.confirmationService.confirm({
			message: UI_HORARIOS_CONFIRM_MESSAGES.unassignProfesor,
			header: UI_CONFIRM_HEADERS.assign,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: UI_CONFIRM_LABELS.yes,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				if (this.vm().loading) return;
				this.crudFacade.desasignarProfesor(
					horarioId,
					currentUser.dni || currentUser.nombreCompleto,
				);
			},
		});
	}

	onDesasignarEstudiante(horarioId: number, estudianteId: number): void {
		this.confirmationService.confirm({
			message: UI_HORARIOS_CONFIRM_MESSAGES.unassignEstudiante,
			header: UI_CONFIRM_HEADERS.assign,
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: UI_CONFIRM_LABELS.yes,
			rejectLabel: UI_CONFIRM_LABELS.cancel,
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				if (this.vm().loading) return;
				this.crudFacade.desasignarEstudiante(horarioId, estudianteId);
			},
		});
	}

	// #endregion
	// #region Event handlers - Import
	onOpenImportDialog(): void {
		this.uiFacade.openImportDialog();
	}

	onImportDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeImportDialog();
		}
	}

	onImportarHorarios(items: ImportarHorarioItem[]): void {
		this.crudFacade.importarHorarios(items);
	}

	// #endregion
	// #region Event handlers - Modal de Cursos
	onOpenCursoDialog(): void {
		this.uiFacade.openCursoDialog();
	}

	onCloseCursoDialog(): void {
		this.uiFacade.closeCursoDialog();
	}

	onSelectCurso(cursoId: number): void {
		this.uiFacade.selectCurso(cursoId);
	}

	// #endregion
	// #region Helpers para template
	trackByHorarioId(_index: number, horario: HorarioResponseDto): number {
		return horario.id;
	}

	// #endregion
	// #region Computed: curso seleccionado
	readonly cursoSeleccionadoLabel = computed(() => {
		const cursoId = this.vm().formData.cursoId;
		if (!cursoId) return 'Seleccionar curso por nivel';
		const curso = this.vm().cursosOptions.find((c) => c.value === cursoId);
		return curso?.label || 'Seleccionar curso';
	});

	readonly cursoSeleccionadoNiveles = computed(() => {
		const cursoId = this.vm().formData.cursoId;
		if (!cursoId) return '';
		const curso = this.vm().cursosOptions.find((c) => c.value === cursoId);
		return curso?.niveles.join(', ') || '';
	});
	// #endregion
}
