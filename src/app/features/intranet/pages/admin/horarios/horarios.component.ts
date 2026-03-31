import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { HorarioDetailDrawerComponent } from './components/horario-detail-drawer/horario-detail-drawer.component';
import { HorariosCursoPickerComponent } from './components/horarios-curso-picker/horarios-curso-picker.component';
import { HorariosFormDialogComponent } from './components/horarios-form-dialog/horarios-form-dialog.component';
import { HorariosImportDialogComponent } from './components/horarios-import-dialog/horarios-import-dialog.component';
import { PageHeaderComponent } from '@shared/components';
import { type ImportarHorarioItem } from './helpers/horario-import.config';
import { type DiaSemana, HorarioResponseDto, type HorarioVistaType } from './models/horario.interface';
import { HorariosCrudFacade, HorariosDataFacade, HorariosUiFacade } from './services';
import { HorariosFiltersComponent } from './components/horarios-filters/horarios-filters.component';
import { HorariosListViewComponent } from './components/horarios-list-view/horarios-list-view.component';
import { HorariosStatsSkeletonComponent } from './components/horarios-stats-skeleton/horarios-stats-skeleton.component';
import { HorariosTableSkeletonComponent } from './components/horarios-table-skeleton/horarios-table-skeleton.component';
import { HorariosWeeklyViewComponent } from './components/horarios-weekly-view/horarios-weekly-view.component';
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
	selector: 'app-horarios',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		ConfirmDialogModule,
		TagModule,
		TooltipModule,
		HorarioDetailDrawerComponent,
		HorariosCursoPickerComponent,
		HorariosFiltersComponent,
		HorariosFormDialogComponent,
		HorariosImportDialogComponent,
		HorariosListViewComponent,
		HorariosStatsSkeletonComponent,
		HorariosTableSkeletonComponent,
		HorariosWeeklyViewComponent,
		PageHeaderComponent,
	],
	templateUrl: './horarios.component.html',
	styleUrl: './horarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ConfirmationService],
})
export class HorariosComponent implements OnInit {
	private dataFacade = inject(HorariosDataFacade);
	private crudFacade = inject(HorariosCrudFacade);
	private uiFacade = inject(HorariosUiFacade);
	private confirmationService = inject(ConfirmationService);

	// * Store signals snapshot (all facades share the same store)
	readonly vm = this.dataFacade.vm;

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

	onLazyLoad(event: { page: number; pageSize: number }): void {
		this.dataFacade.loadPage(event.page, event.pageSize);
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
	// #region Event handlers - Filtros
	onFiltroSalonChange(salonId: number | null): void {
		this.dataFacade.setFiltroSalon(salonId);
	}

	onFiltroProfesorChange(profesorId: number | null): void {
		this.dataFacade.setFiltroProfesor(profesorId);
	}

	onFiltroDiaSemanaChange(diaSemana: DiaSemana | null): void {
		this.dataFacade.setFiltroDiaSemana(diaSemana);
	}

	onFiltroEstadoChange(estadoActivo: boolean | null): void {
		this.dataFacade.setFiltroEstadoActivo(estadoActivo);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
	}

	// #endregion
	// #region Event handlers - Wizard Dialog
	onNextStep(): void {
		this.uiFacade.nextWizardStep();
	}

	onPrevStep(): void {
		this.uiFacade.prevWizardStep();
	}

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
	// #region Event handlers - Vista
	onCambiarVista(vista: HorarioVistaType): void {
		this.dataFacade.setVistaActual(vista);
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
