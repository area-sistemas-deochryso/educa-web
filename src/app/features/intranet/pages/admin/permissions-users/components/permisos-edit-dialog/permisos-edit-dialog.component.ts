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
import { PermissionsUsersFacade } from '../../services/permisos-usuarios.facade';

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
	private facade = inject(PermissionsUsersFacade);
	readonly uiMapping = inject(UiMappingService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly visibleChange = output<void>();
	readonly save = output<void>();
	// #endregion

	// #region Facade state
	readonly isEditing = this.facade.isEditing;
	readonly selectedPermiso = this.facade.selectedPermiso;
	readonly selectedUsuarioId = this.facade.selectedUsuarioId;
	readonly selectedRol = this.facade.selectedRol;
	readonly selectedVistas = this.facade.selectedVistas;
	readonly modulosVistas = this.facade.modulosVistas;
	readonly activeModuloIndex = this.facade.activeModuloIndex;
	readonly vistasBusqueda = this.facade.vistasBusqueda;
	readonly vistasFiltradas = this.facade.vistasFiltradas;
	readonly vistasCountLabel = this.facade.vistasCountLabel;
	readonly isAllModuloSelected = this.facade.isAllModuloSelected;
	readonly usuariosSugeridos = this.facade.usuariosSugeridos;
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
		this.facade.setSelectedRol(rol);
	}

	onRolChange(): void {
		this.selectedUsuario = null;
		this.facade.loadVistasFromRol();
	}

	onActiveModuloIndexChange(index: number): void {
		this.facade.setActiveModuloIndex(index);
	}

	onVistasBusquedaChange(term: string): void {
		this.facade.setVistasBusqueda(term);
	}

	buscarUsuarios(event: AutoCompleteCompleteEvent): void {
		const termino = event.query?.trim() || '';
		this.facade.searchUsuarios(termino);
	}

	onUsuarioSeleccionado(event: AutoCompleteSelectEvent): void {
		const usuario = event.value as UsuarioBusqueda;
		this.selectedUsuario = usuario;
		this.facade.setSelectedUsuarioId(usuario.id);
	}

	onUsuarioClear(): void {
		this.selectedUsuario = null;
		this.facade.setSelectedUsuarioId(null);
	}

	isVistaSelected(ruta: string): boolean {
		return this.facade.isVistaSelected(ruta);
	}

	toggleVista(ruta: string): void {
		this.facade.toggleVista(ruta);
	}

	toggleAllVistasModulo(): void {
		this.facade.toggleAllVistasModulo();
	}

	/** Reset local state when parent opens a new dialog */
	resetLocalState(): void {
		this.selectedUsuario = null;
	}
	// #endregion
}
