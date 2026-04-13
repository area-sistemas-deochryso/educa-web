// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, inject, computed } from '@angular/core';
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
import { NotificacionesAdminFacade, NotificacionesAdminStore } from './services';
import type { NotificacionFormData } from './services';
import { NotificacionLista } from '@data/models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-notificaciones-admin',
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
	templateUrl: './notificaciones-admin.component.html',
	styleUrl: './notificaciones-admin.component.scss',
})
export class NotificacionesAdminComponent implements OnInit {
	// #region Dependencias
	private facade = inject(NotificacionesAdminFacade);
	private store = inject(NotificacionesAdminStore);
	private confirmationService = inject(ConfirmationService);
	readonly uiMapping = inject(UiMappingService);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Opciones de filtros
	readonly tipoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Matrícula', value: 'matricula' },
		{ label: 'Pago', value: 'pago' },
		{ label: 'Académico', value: 'academico' },
		{ label: 'Festividad', value: 'festividad' },
		{ label: 'Evento', value: 'evento' },
	];

	readonly prioridadOptions = [
		{ label: 'Baja', value: 'low' },
		{ label: 'Media', value: 'medium' },
		{ label: 'Alta', value: 'high' },
		{ label: 'Urgente', value: 'urgent' },
	];

	readonly estadoOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

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
		{ label: 'Refrescar', value: 'pi-refresh' },
	];

	readonly destinatarioRolOptions = [
		{ label: 'Todos', value: null },
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Apoderado', value: 'Apoderado' },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
		{ label: 'Promotor', value: 'Promotor' },
	];

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
		{ label: '5° Secundaria', value: '5° Secundaria' },
	];

	readonly destinatarioSeccionOptions = [
		{ label: 'Todos', value: null },
		{ label: 'A', value: 'A' },
		{ label: 'B', value: 'B' },
		{ label: 'C', value: 'C' },
		{ label: 'D', value: 'D' },
		{ label: 'V (Vacacional)', value: 'V' },
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

	onEdit(item: NotificacionLista): void {
		this.facade.openEditDialog(item);
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
	// #endregion

	// #region Dialog handlers
	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeDialog();
	}

	onConfirmDialogHide(): void {
		this.facade.closeConfirmDialog();
	}
	// #endregion

	// #region UI helpers
	getDestinatarioLabel(item: NotificacionLista): string {
		const parts: string[] = [];
		if (item.destinatarioRol) parts.push(item.destinatarioRol);
		if (item.destinatarioGrado) parts.push(item.destinatarioGrado);
		if (item.destinatarioSeccion) parts.push(`Sección ${item.destinatarioSeccion}`);
		return parts.length > 0 ? parts.join(' - ') : 'Todos';
	}
	// #endregion
}
// #endregion
