import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { calcPageFromLazyEvent } from '@core/helpers';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { UiMappingService } from '@shared/services';
import { PageHeaderComponent } from '@shared/components';
import { EstadoLabelPipe, EstadoSeverityPipe, EstadoToggleIconPipe, EstadoToggleLabelPipe } from '@shared/pipes';
import { buildDeleteCursoMessage } from '@app/shared/constants';

import { CursosFacade } from './services';
import type { Curso } from './models';

@Component({
	selector: 'app-cursos',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TableModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		InputTextModule,
		SelectModule,
		ToggleSwitch,
		ConfirmDialogModule,
		PageHeaderComponent,
		EstadoLabelPipe,
		EstadoSeverityPipe,
		EstadoToggleIconPipe,
		EstadoToggleLabelPipe,
	],
	providers: [ConfirmationService],
	templateUrl: './cursos.component.html',
	styleUrl: './cursos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursosComponent implements OnInit {
	// #region Dependencias
	private facade = inject(CursosFacade);
	private confirmationService = inject(ConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	/** Guard para ignorar el onLazyLoad inicial (ngOnInit ya carga los datos) */
	private initialLoadDone = signal(false);
	// #endregion

	// #region Opciones estáticas
	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	readonly nivelOptions = [
		{ label: 'Todos los niveles', value: null },
		{ label: 'Inicial', value: 'INICIAL' },
		{ label: 'Primaria', value: 'PRIMARIA' },
		{ label: 'Secundaria', value: 'SECUNDARIA' },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadAll();
	}
	// #endregion

	// #region Event handlers
	onLazyLoad(event: { first?: number; rows?: number }): void {
		if (!this.initialLoadDone()) {
			this.initialLoadDone.set(true);
			return;
		}
		const { page, rows } = calcPageFromLazyEvent(event);
		this.facade.loadPage(page, rows);
	}

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
			accept: () => this.facade.delete(curso),
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
