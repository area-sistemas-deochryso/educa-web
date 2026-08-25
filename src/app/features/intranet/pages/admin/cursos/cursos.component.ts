import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { UiMappingService } from '@intranet-shared/services';
import { PageHeaderComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleIconPipe, EstadoToggleLabelPipe } from '@intranet-shared/pipes';
import { buildDeleteCursoMessage } from '@app/shared/constants';

import { CursosFacade } from './services';
import type { Curso } from './models';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduDialog, EduInputText, EduSelect, EduSortableColumn, EduTable, EduTag, EduToggle, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-cursos',
	standalone: true,
	imports: [CommonModule, FormsModule, EduTable, EduButton, EduDialog, EduTooltip, EduTag, EduInputText, EduSelect, EduToggle, EduConfirmDialog, PageHeaderComponent, KpiStatsComponent, EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleIconPipe, EstadoToggleLabelPipe, EduSortableColumn],
	providers: [EduConfirmationService],
	templateUrl: './cursos.component.html',
	styleUrl: './cursos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursosComponent implements OnInit {
	// #region Dependencias
	private facade = inject(CursosFacade);
	private confirmationService = inject(EduConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	showValidation = signal(false);
	// #endregion

	// #region Stats KPI
	readonly statsItems = computed<KpiStatItem[]>(() => [
		{
			icon: 'pi pi-book',
			label: 'Total Cursos',
			value: this.vm().estadisticas.totalCursos,
			sublabel: 'registrados',
		},
		{
			icon: 'pi pi-check-circle',
			label: 'Cursos Activos',
			value: this.vm().estadisticas.cursosActivos,
			sublabel: 'disponibles',
		},
		{
			icon: 'pi pi-ban',
			label: 'Cursos Inactivos',
			value: this.vm().estadisticas.cursosInactivos,
			sublabel: 'deshabilitados',
		}]);
	// #endregion

	// #region Opciones estáticas
	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false }];

	readonly nivelOptions = [
		{ label: 'Todos los niveles', value: null },
		{ label: 'Inicial', value: 'INICIAL' },
		{ label: 'Primaria', value: 'PRIMARIA' },
		{ label: 'Secundaria', value: 'SECUNDARIA' }];

	readonly completitudOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Completo', value: 'completo' },
		{ label: 'Incompleto', value: 'incompleto' },
		{ label: 'Sin horario', value: 'sin-horario' },
		{ label: 'Sin profesor', value: 'sin-profesor' },
		{ label: 'Con conflictos', value: 'con-conflictos' }];
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

	editCurso(curso: Curso): void {
		this.facade.openEditDialog(curso);
	}

	saveCurso(): void {
		this.showValidation.set(true);
		this.facade.saveCurso();
	}

	showGrados(curso: Curso): void {
		this.facade.showGrados(curso);
	}

	toggleEstado(curso: Curso): void {
		this.facade.toggleEstado(curso);
	}

	deleteCurso(curso: Curso): void {
		this.facade.openConfirmDialog();

		this.confirmationService.confirm({
			message: buildDeleteCursoMessage(curso.nombre),
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				if (this.vm().loading) return;
				this.facade.delete(curso);
			},
		});
	}

	addGrado(gradoId: number): void {
		this.facade.addGrado(gradoId);
	}

	removeGrado(gradoId: number): void {
		this.facade.removeGrado(gradoId);
	}

	updateFormField(field: 'nombre' | 'estado', value: string | boolean): void {
		this.facade.updateFormField(field, value);
	}

	clearFilters(): void {
		this.facade.clearFilters();
	}

	onSearchTermChange(term: string): void {
		this.facade.setSearchTerm(term);
	}

	onFilterEstadoChange(estado: boolean | null): void {
		this.facade.setFilterEstado(estado);
	}

	onFilterNivelChange(nivel: string | null): void {
		this.facade.setFilterNivel(nivel);
	}

	onFilterCompletitudChange(
		valor: 'completo' | 'incompleto' | 'sin-horario' | 'sin-profesor' | 'con-conflictos' | null,
	): void {
		this.facade.setFilterCompletitud(valor);
	}
	// #endregion

	// #region Dialog sync handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onGradosDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeGradosDialog();
		}
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion
}
