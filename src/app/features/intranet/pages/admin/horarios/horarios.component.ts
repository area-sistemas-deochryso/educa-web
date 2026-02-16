import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { CursoOption } from './models/curso.interface';
import { HorarioDetailDrawerComponent } from './components/horario-detail-drawer/horario-detail-drawer.component';
import { HorarioResponseDto } from './models/horario.interface';
import { HorariosFacade } from './services/horarios.facade';
import { HorariosFiltersComponent } from './components/horarios-filters/horarios-filters.component';
import { HorariosListViewComponent } from './components/horarios-list-view/horarios-list-view.component';
import { HorariosWeeklyViewComponent } from './components/horarios-weekly-view/horarios-weekly-view.component';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';
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
		FormsModule,
		BadgeModule,
		ButtonModule,
		ConfirmDialogModule,
		DialogModule,
		InputTextModule,
		ProgressSpinnerModule,
		SelectModule,
		Tabs,
		TabList,
		Tab,
		TabPanel,
		TagModule,
		TooltipModule,
		HorarioDetailDrawerComponent,
		HorariosFiltersComponent,
		HorariosListViewComponent,
		HorariosWeeklyViewComponent,
	],
	templateUrl: './horarios.component.html',
	styleUrl: './horarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ConfirmationService],
})
export class HorariosComponent implements OnInit {
	private facade = inject(HorariosFacade);
	private confirmationService = inject(ConfirmationService);

	// * Store signals snapshot
	readonly vm = this.facade.vm;

	// #region Lifecycle
	ngOnInit(): void {
		// * Initial load
		this.loadData();
	}

	// #endregion
	// #region Métodos de carga
	loadData(): void {
		this.facade.loadAll();
	}

	refresh(): void {
		// * Manual refresh
		logger.log('Refrescando horarios...');
		this.loadData();
	}

	// #endregion
	// #region Event handlers - CRUD
	onNew(): void {
		this.facade.openNewDialog();
	}

	onEdit(id: number): void {
		this.facade.openEditDialog(id);
	}

	onViewDetail(id: number): void {
		this.facade.loadDetalle(id);
	}

	onToggleEstado(id: number, estadoActual: boolean): void {
		// ! Confirm before toggling active state.
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
				this.facade.toggleEstado(id, estadoActual);
			},
		});
	}

	onDelete(id: number): void {
		// ! Confirm before delete.
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
				this.facade.delete(id);
			},
		});
	}

	// #endregion
	// #region Event handlers - Filtros
	onFiltroSalonChange(salonId: number | null): void {
		this.facade.setFiltroSalon(salonId);
	}

	onFiltroProfesorChange(profesorId: number | null): void {
		this.facade.setFiltroProfesor(profesorId);
	}

	onFiltroDiaSemanaChange(diaSemana: number | null): void {
		this.facade.setFiltroDiaSemana(diaSemana);
	}

	onFiltroEstadoChange(estadoActivo: boolean | null): void {
		this.facade.setFiltroEstadoActivo(estadoActivo);
	}

	onClearFiltros(): void {
		this.facade.clearFiltros();
	}

	// #endregion
	// #region Event handlers - Wizard Dialog
	onNextStep(): void {
		this.facade.nextWizardStep();
	}

	onPrevStep(): void {
		this.facade.prevWizardStep();
	}

	onSaveHorario(): void {
		// ! Create/update schedule from wizard form.
		const formData = this.vm().formData;
		const editingId = this.vm().editingId;
		const currentUser = this.vm().currentUser;

		if (!currentUser) {
			logger.error('Usuario no autenticado');
			return;
		}

		if (editingId === null) {
			// CREAR - Solo datos básicos, profesor y estudiantes se asignan después
			this.facade.create({
				diaSemana: formData.diaSemana!,
				horaInicio: formData.horaInicio,
				horaFin: formData.horaFin,
				salonId: formData.salonId!,
				cursoId: formData.cursoId!,
				usuarioReg: currentUser.dni || currentUser.nombreCompleto,
			});
		} else {
			// EDITAR
			this.facade.update(editingId, {
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
		this.facade.closeDialog();
	}

	// #endregion
	// #region Event handlers - Detail Drawer
	onCloseDetailDrawer(): void {
		this.facade.closeDetailDrawer();
	}

	// #endregion
	// #region Event handlers - Asignaciones
	onAsignarProfesor(horarioId: number, profesorId: number): void {
		const currentUser = this.vm().currentUser;
		if (!currentUser) return;

		this.facade.asignarProfesor({
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
				this.facade.asignarTodosEstudiantes(
					horarioId,
					currentUser.dni || currentUser.nombreCompleto,
				);
			},
		});
	}

	// #endregion
	// #region Event handlers - Vista
	onCambiarVista(vista: 'semanal' | 'lista'): void {
		this.facade.setVistaActual(vista);
	}

	// #endregion
	// #region Event handlers - Modal de Cursos
	onOpenCursoDialog(): void {
		this.facade.openCursoDialog();
	}

	onCloseCursoDialog(): void {
		this.facade.closeCursoDialog();
	}

	onSelectCurso(cursoId: number): void {
		this.facade.selectCurso(cursoId);
	}

	// #endregion
	// #region Helpers para template
	trackByHorarioId(_index: number, horario: HorarioResponseDto): number {
		return horario.id;
	}

	trackByCursoId(_index: number, curso: CursoOption): number {
		return curso.value;
	}

	// #endregion
	// #region Helpers para curso seleccionado
	getCursoSeleccionadoLabel(): string {
		const cursoId = this.vm().formData.cursoId;
		if (!cursoId) return 'Seleccionar curso por nivel';

		const curso = this.vm().cursosOptions.find((c) => c.value === cursoId);
		return curso?.label || 'Seleccionar curso';
	}

	getCursoSeleccionadoNiveles(): string {
		const cursoId = this.vm().formData.cursoId;
		if (!cursoId) return '';

		const curso = this.vm().cursosOptions.find((c) => c.value === cursoId);
		return curso?.niveles.join(', ') || '';
	}
	// #endregion
}
