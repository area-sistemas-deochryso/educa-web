import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { PageHeaderComponent } from '@intranet-shared/components';
import type { UsuarioBusqueda } from '@core/services';

import { PermissionsUsersDataFacade } from './services';

@Component({
	selector: 'app-permissions-users',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DialogModule,
		TooltipModule,
		TagModule,
		SelectModule,
		InputTextModule,
		CheckboxModule,
		AutoCompleteModule,
		RouterLink,
		PageHeaderComponent,
	],
	templateUrl: './permisos-usuarios.component.html',
	styleUrl: './permisos-usuarios.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsUsersComponent implements OnInit {
	private facade = inject(PermissionsUsersDataFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadCatalogAndMatrix();
	}

	refresh(): void {
		this.facade.refresh();
	}

	onSearchUsers(event: { query: string }): void {
		const rolId = this.vm().selectedRolId;
		const rolRow = this.vm().roles.find((r) => r.value === rolId);
		this.facade.searchUsers(event.query, rolRow?.label);
	}

	onSelectUsuario(usuario: UsuarioBusqueda): void {
		this.facade.selectUsuario(usuario);
		if (this.vm().selectedRolId) {
			this.facade.setSelectedRolId(this.vm().selectedRolId);
		}
	}

	onRolChange(rolId: number | null): void {
		this.facade.setSelectedRolId(rolId);
	}

	openEditDialog(): void {
		this.facade.openEditDialog();
	}

	saveOverrides(): void {
		this.facade.saveOverrides();
	}

	closeDialog(): void {
		this.facade.closeDialog();
	}

	toggleGrant(capId: number): void {
		this.facade.toggleGrant(capId);
	}

	toggleDeny(capId: number): void {
		this.facade.toggleDeny(capId);
	}

	onActiveModuloIndexChange(index: number): void {
		this.facade.setActiveModuloIndex(index);
	}

	onCapBusquedaChange(term: string): void {
		this.facade.setCapBusqueda(term);
	}

	resetSelection(): void {
		this.facade.resetSelection();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}
}
