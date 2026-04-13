import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import {
	AutoCompleteModule,
	AutoCompleteCompleteEvent,
	AutoCompleteSelectEvent,
} from 'primeng/autocomplete';

import { ROLES_DISPONIBLES_ADMIN, RolTipoAdmin, UsuarioBusqueda } from '@core/services';
import { UiMappingService } from '@shared/services';
import { PermissionsUsersDataFacade, PermissionsUsersCrudFacade, PermissionsUsersUiFacade } from '../../services';

@Component({
	selector: 'app-permissions-edit-dialog',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		CheckboxModule,
		DialogModule,
		InputTextModule,
		SelectModule,
		TagModule,
		AutoCompleteModule,
	],
	templateUrl: './permisos-edit-dialog.component.html',
	styleUrl: './permisos-edit-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsEditDialogComponent {
	private data = inject(PermissionsUsersDataFacade);
	private crud = inject(PermissionsUsersCrudFacade);
	private ui = inject(PermissionsUsersUiFacade);
	readonly uiMapping = inject(UiMappingService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly visibleChange = output<void>();
	readonly save = output<void>();
	// #endregion

	// #region Facade state
	readonly isEditing = this.ui.isEditing;
	readonly selectedPermiso = this.data.selectedPermiso;
	readonly selectedUsuarioId = this.ui.selectedUsuarioId;
	readonly selectedRol = this.data.selectedRol;
	readonly selectedVistas = this.data.selectedVistas;
	readonly modulosVistas = this.ui.modulosVistas;
	readonly activeModuloIndex = this.ui.activeModuloIndex;
	readonly vistasBusqueda = this.ui.vistasBusqueda;
	readonly vistasFiltradas = this.ui.vistasFiltradas;
	readonly vistasCountLabel = this.data.vistasCountLabel;
	readonly isAllModuloSelected = this.ui.isAllModuloSelected;
	readonly usuariosSugeridos = this.data.usuariosSugeridos;
	// #endregion

	// #region Local state
	selectedUsuario: UsuarioBusqueda | null = null;
	rolesSelectOptions = ROLES_DISPONIBLES_ADMIN.map((r) => ({ label: r, value: r }));
	// #endregion

	// #region Dialog header
	get dialogHeader(): string {
		if (this.isEditing()) {
			return 'Editar Permisos - ' + (this.selectedPermiso()?.nombreUsuario || 'Usuario');
		}
		return 'Nuevo Permiso Personalizado';
	}

	get isSaveDisabled(): boolean {
		return (
			(!this.isEditing() && (!this.selectedUsuarioId() || !this.selectedRol())) ||
			this.selectedVistas().length === 0
		);
	}
	// #endregion

	// #region Event handlers
	onHideDialog(): void {
		this.visibleChange.emit();
	}

	onSave(): void {
		this.save.emit();
	}

	onSelectedRolChange(rol: RolTipoAdmin | null): void {
		this.ui.setSelectedRol(rol);
	}

	onRolChange(): void {
		this.selectedUsuario = null;
		this.data.loadVistasFromRol();
	}

	onActiveModuloIndexChange(index: number): void {
		this.ui.setActiveModuloIndex(index);
	}

	onVistasBusquedaChange(term: string): void {
		this.ui.setVistasBusqueda(term);
	}

	buscarUsuarios(event: AutoCompleteCompleteEvent): void {
		const termino = event.query?.trim() || '';
		this.data.searchUsuarios(termino);
	}

	onUsuarioSeleccionado(event: AutoCompleteSelectEvent): void {
		const usuario = event.value as UsuarioBusqueda;
		this.selectedUsuario = usuario;
		this.ui.setSelectedUsuarioId(usuario.id);
	}

	onUsuarioClear(): void {
		this.selectedUsuario = null;
		this.ui.setSelectedUsuarioId(null);
	}

	isVistaSelected(ruta: string): boolean {
		return this.crud.isVistaSelected(ruta);
	}

	toggleVista(ruta: string): void {
		this.crud.toggleVista(ruta);
	}

	toggleAllVistasModulo(): void {
		this.crud.toggleAllVistasModulo();
	}

	/** Reset local state when parent opens a new dialog */
	resetLocalState(): void {
		this.selectedUsuario = null;
	}
	// #endregion
}
