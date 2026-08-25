// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserPermissionsService } from '@core/services';

import { TicketTipoAdminDto } from '../models/ticket-admin.models';
import { TicketTipoCatalogoFacade } from '../services/ticket-tipo-catalogo.facade';
import { EduButton, EduDialog, EduInputText, EduSortableColumn, EduSpinner, EduTable, EduTag, EduToggle } from '@edu-ui';
// #endregion

const AYUDA_TICKET_MANAGE = 'AYUDA_TICKET_MANAGE';

/**
 * Catálogo de tipos de problema (`TicketTipo`) — CRUD admin (F7a en `Educa.API`,
 * F7b en `educa-web`). Sin acción de "eliminar": solo activar/desactivar
 * (`toggleEstado`), coherente con que F7a no expone hard-delete.
 */
@Component({
	selector: 'app-ticket-tipos',
	standalone: true,
	imports: [EduTable, CommonModule, FormsModule, EduButton, EduDialog, EduInputText, EduSpinner, EduSortableColumn, EduTag, EduToggle],
	providers: [TicketTipoCatalogoFacade],
	templateUrl: './ticket-tipos.component.html',
	styleUrl: './ticket-tipos.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketTiposComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(TicketTipoCatalogoFacade);
	private readonly userPermisos = inject(UserPermissionsService);
	// #endregion

	// #region State
	readonly tipos = this.facade.tipos;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;
	readonly submitting = this.facade.submitting;

	readonly canAccess = this.userPermisos.hasCapability(AYUDA_TICKET_MANAGE);

	readonly dialogVisible = signal(false);
	readonly editingTipo = signal<TicketTipoAdminDto | null>(null);
	readonly nombreForm = signal('');
	// #endregion

	ngOnInit(): void {
		if (this.canAccess) this.facade.init();
	}

	// #region Handlers
	openCreateDialog(): void {
		this.editingTipo.set(null);
		this.nombreForm.set('');
		this.dialogVisible.set(true);
	}

	openEditDialog(tipo: TicketTipoAdminDto): void {
		this.editingTipo.set(tipo);
		this.nombreForm.set(tipo.nombre);
		this.dialogVisible.set(true);
	}

	closeDialog(): void {
		this.dialogVisible.set(false);
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.closeDialog();
	}

	onNombreChange(value: string): void {
		this.nombreForm.set(value);
	}

	guardar(): void {
		const nombre = this.nombreForm().trim();
		if (!nombre) return;

		const editing = this.editingTipo();
		if (editing) {
			this.facade.editar(editing, nombre);
		} else {
			this.facade.crear(nombre);
		}
		this.closeDialog();
	}

	toggleEstado(tipo: TicketTipoAdminDto): void {
		this.facade.toggleEstado(tipo);
	}
	// #endregion
}
