import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DrawerModule } from 'primeng/drawer';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';

import { PageHeaderComponent } from '@intranet-shared/components';

import { PermissionsRolesFacade } from './services';
import type { RolCapabilityMatrixRow } from '@core/services';
import { VistasComponent } from '../vistas';

@Component({
	selector: 'app-permissions-roles',
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
		CheckboxModule,
		DrawerModule,
		Tabs, TabList, Tab, TabPanel,
		PageHeaderComponent,
		VistasComponent,
	],
	templateUrl: './permisos-roles.component.html',
	styleUrl: './permisos-roles.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsRolesComponent implements OnInit {
	private facade = inject(PermissionsRolesFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadAll();
	}

	refresh(): void {
		this.facade.refresh();
	}

	editRole(row: RolCapabilityMatrixRow): void {
		this.facade.openEditDialog(row);
	}

	saveCapabilities(): void {
		this.facade.saveCapabilities();
	}

	openDetail(row: RolCapabilityMatrixRow): void {
		this.facade.openDetail(row);
	}

	closeDetail(): void {
		this.facade.closeDetail();
	}

	editFromDetail(): void {
		this.facade.editFromDetail();
	}

	toggleCapability(capId: number): void {
		this.facade.toggleCapability(capId);
	}

	toggleAllCapabilitiesModulo(): void {
		this.facade.toggleAllCapabilitiesModulo();
	}

	onActiveModuloIndexChange(index: number): void {
		this.facade.setActiveModuloIndex(index);
	}

	onCapBusquedaChange(term: string): void {
		this.facade.setCapBusqueda(term);
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDetail();
		}
	}
}
