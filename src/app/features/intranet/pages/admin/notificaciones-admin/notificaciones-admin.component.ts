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

import { NotificacionesAdminFacade } from './services/notificaciones-admin.facade';
import { NotificacionesAdminStore, NotificacionFormData } from './services/notificaciones-admin.store';
import { NotificacionLista } from '@core/services/notificaciones-admin';

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
			accept: () => this.facade.delete(item),
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
	getTipoSeverity(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
		const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
			matricula: 'info',
			pago: 'warn',
			academico: 'success',
			festividad: 'contrast',
			evento: 'secondary',
		};
		return map[tipo] ?? 'secondary';
	}

	getPrioridadSeverity(prioridad: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
		const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
			low: 'info',
			medium: 'warn',
			high: 'danger',
			urgent: 'danger',
		};
		return map[prioridad] ?? 'secondary';
	}

	getPrioridadLabel(prioridad: string): string {
		const map: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
		return map[prioridad] ?? prioridad;
	}

	getTipoLabel(tipo: string): string {
		const map: Record<string, string> = {
			matricula: 'Matrícula',
			pago: 'Pago',
			academico: 'Académico',
			festividad: 'Festividad',
			evento: 'Evento',
		};
		return map[tipo] ?? tipo;
	}
	// #endregion
}
// #endregion
